import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const apiKey = Deno.env.get('REVOLUT_API_KEY');
    if (!apiKey) return Response.json({ error: 'REVOLUT_API_KEY not set' }, { status: 500 });

    const results = { transactions_checked: 0, invoices_matched: 0, xero_payments_recorded: 0 };

    // --- Fetch Revolut transactions (last 3 days) ---
    const fromDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const txRes = await fetch(`https://merchant.revolut.com/api/1.0/transactions?from=${fromDate}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!txRes.ok) {
      const errText = await txRes.text();
      return Response.json({ error: `Revolut API error: ${errText}` }, { status: 500 });
    }

    const transactions = await txRes.json();
    const incoming = (Array.isArray(transactions) ? transactions : []).filter(t =>
      t.state === 'completed' && parseFloat(t.amount) > 0 && (t.type === 'receive' || t.type === 'topup' || t.type === 'refund')
    );

    results.transactions_checked = incoming.length;

    // --- Match incoming payments to outstanding invoices ---
    const outstanding = await base44.asServiceRole.entities.Invoice.filter({ status: 'sent' });
    const overdue = await base44.asServiceRole.entities.Invoice.filter({ status: 'overdue' });
    const unpaidInvoices = [...outstanding, ...overdue];

    // Get Xero access token for payment recording
    let xeroAccessToken = null;
    const tokens = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'xero' });
    if (tokens.length > 0) {
      const tokenRecord = tokens[0];
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
        xeroAccessToken = tokenData.access_token;
        await base44.asServiceRole.entities.IntegrationToken.update(tokenRecord.id, {
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        });
      }
    }

    let xeroBankAccountId = null;
    if (xeroAccessToken) {
      try {
        const accountsRes = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
          headers: {
            Authorization: `Bearer ${xeroAccessToken}`,
            'Xero-tenant-id': Deno.env.get('XERO_TENANT_ID'),
          },
        });
        const accountsData = await accountsRes.json();
        xeroBankAccountId = accountsData.Accounts?.find(a => a.Type === 'BANK')?.AccountID;
      } catch (e) {
        console.error('Xero accounts fetch failed:', e.message);
      }
    }

    for (const tx of incoming) {
      const txAmount = parseFloat(tx.amount);
      // Match by exact amount (within 1 cent tolerance for rounding)
      const match = unpaidInvoices.find(inv => Math.abs(inv.total - txAmount) < 0.01);
      if (match) {
        // Mark invoice as paid
        await base44.asServiceRole.entities.Invoice.update(match.id, { status: 'paid' });
        results.invoices_matched++;

        // Remove from unpaid list to prevent double-matching
        const idx = unpaidInvoices.findIndex(inv => inv.id === match.id);
        if (idx > -1) unpaidInvoices.splice(idx, 1);

        // Remove credit hold if applicable
        try {
          const clients = await base44.asServiceRole.entities.Client.filter({ name: match.client });
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
        if (xeroAccessToken && match.xero_invoice_id && xeroBankAccountId) {
          try {
            const paymentRes = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${xeroAccessToken}`,
                'Xero-tenant-id': Deno.env.get('XERO_TENANT_ID'),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Payments: [{
                  Invoice: { InvoiceID: match.xero_invoice_id },
                  Account: { AccountID: xeroBankAccountId },
                  Amount: match.total,
                  Date: new Date().toISOString().split('T')[0],
                  Reference: `Revolut: ${tx.id || 'bank transfer'}`,
                }],
              }),
            });
            if (paymentRes.ok) results.xero_payments_recorded++;
          } catch (e) {
            console.error('Xero payment recording failed:', e.message);
          }
        }
      }
    }

    // --- Post reconciliation summary to Slack ---
    if (results.invoices_matched > 0) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('slack');
        const channels = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(r => r.json());
        const opsChannel = channels.channels?.find(c => c.name.toLowerCase().includes('operations') || c.name.toLowerCase().includes('ops'));
        if (opsChannel) {
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: opsChannel.id,
              text: `:white_check_mark: *Revolut Reconciliation Complete*\n\nTransactions checked: ${results.transactions_checked}\nInvoices auto-matched & paid: ${results.invoices_matched}\nXero payments recorded: ${results.xero_payments_recorded}`,
            }),
          });
        }
      } catch (e) {
        console.error('Slack notification failed:', e.message);
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('revolutReconcile error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});