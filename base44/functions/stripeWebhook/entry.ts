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
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ invoice_no: invoiceNo, status: { '$ne': 'paid' } });
        if (invoices.length > 0) {
          const inv = invoices[0];
          await base44.asServiceRole.entities.Invoice.update(inv.id, {
            status: 'paid',
            stripe_session_id: session.id,
          });
          console.log(`Payment processed for invoice ${invoiceNo}, session ${session.id}`);

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

          // Record payment in Xero
          if (inv.xero_invoice_id) {
            try {
              const tokens = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'xero' });
              if (tokens.length > 0) {
                const tokenRecord = tokens[0];
                const xeroTenantId = Deno.env.get('XERO_TENANT_ID');
                if (!xeroTenantId) {
                  throw new Error('XERO_TENANT_ID environment variable not set');
                }

                const refreshRes = await fetch('https://identity.xero.com/connect/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  grant_type: 'refresh_token',
                  refresh_token: tokenRecord.refresh_token,
                  client_id: Deno.env.get('XERO_CLIENT_ID'),
                  client_secret: Deno.env.get('XERO_CLIENT_SECRET'),
                }),
                });
                if (refreshRes.ok) {
                const tokenData = await refreshRes.json();
                await base44.asServiceRole.entities.IntegrationToken.update(tokenRecord.id, {
                  refresh_token: tokenData.refresh_token,
                  access_token: tokenData.access_token,
                  expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                });
                // Find bank account in Xero
                const accountsRes = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
                  headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'Xero-tenant-id': xeroTenantId,
                  },
                });
                const accountsData = await accountsRes.json();
                const bankAccount = accountsData.Accounts?.find(a => a.Type === 'BANK');
                if (bankAccount) {
                  await fetch('https://api.xero.com/api.xro/2.0/Payments', {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${tokenData.access_token}`,
                      'Xero-tenant-id': xeroTenantId,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      Payments: [{
                        Invoice: { InvoiceID: inv.xero_invoice_id },
                        Account: { AccountID: bankAccount.AccountID },
                        Amount: inv.total,
                        Date: new Date().toISOString().split('T')[0],
                        Reference: `Stripe: ${session.id}`,
                      }],
                    }),
                  });
                }
                }
              }
            } catch (e) {
              console.error('Xero payment sync failed:', e.message);
            }
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