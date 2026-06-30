import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const origin = req.headers.get('origin');
    if (!origin) return Response.json({ error: 'Origin header required' }, { status: 400 });
    const baseUrl = origin.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: Math.round(invoice.total * 100),
          product_data: {
            name: `Invoice ${invoice.invoice_no}`,
            description: `Waste services — ${invoice.client}`,
          },
        },
      }],
      metadata: {
        invoice_no: invoice.invoice_no,
        invoice_id: invoice.id,
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
      },
      success_url: `${baseUrl}/finance?payment=success&invoice=${invoice.invoice_no}`,
      cancel_url: `${baseUrl}/finance?payment=cancelled&invoice=${invoice.invoice_no}`,
    });
    console.log(`Checkout session created for invoice ${invoice.invoice_no}, user ${user.id}`);

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      stripe_session_id: session.id,
      stripe_payment_url: session.url,
      status: 'sent',
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('createCheckoutSession error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});