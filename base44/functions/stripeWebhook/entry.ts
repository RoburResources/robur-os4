import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'No signature header' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Signature verification failed:', err.message);
      return Response.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const invoiceNo = session.metadata?.invoice_no;

      if (invoiceNo) {
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ invoice_no: invoiceNo });
        if (invoices.length > 0) {
          const inv = invoices[0];
          await base44.asServiceRole.entities.Invoice.update(inv.id, {
            status: 'paid',
            stripe_session_id: session.id,
          });

          // Remove credit hold if client has one
          try {
            const clients = await base44.asServiceRole.entities.Client.filter({ name: inv.client });
            if (clients.length > 0 && clients[0].credit_hold) {
              await base44.asServiceRole.entities.Client.update(clients[0].id, {
                credit_hold: false,
                credit_hold_reason: '',
              });
            }
          } catch (e) {
            console.error('Credit hold removal failed:', e.message);
          }
        }
      }
    }

    return Response.json({ received: true, type: event.type });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});