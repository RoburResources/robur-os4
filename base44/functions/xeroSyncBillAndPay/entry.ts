import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const si = body.data || body;

    if (!si || !si.invoice_no) {
      return Response.json({ skipped: true, reason: 'No supplier invoice data' });
    }

    // Only process approved supplier invoices
    if (si.status !== 'approved') {
      return Response.json({ skipped: true, reason: `Status is ${si.status}, not approved` });
    }

    // Skip if already synced to Xero
    if (si.xero_bill_id) {
      return Response.json({ skipped: true, reason: 'Already synced to Xero' });
    }

    // --- Xero token refresh ---
    const tokens = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'xero' });
    if (tokens.length === 0) {
      return Response.json({ error: 'Xero token not initialized' }, { status: 500 });
    }
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
    if (!refreshRes.ok) {
      const errText = await refreshRes.text();
      console.error('Xero token refresh failed:', errText);
      return Response.json({ error: `Xero token refresh failed: ${errText}` }, { status: 500 });
    }
    const tokenData = await refreshRes.json();
    await base44.asServiceRole.entities.IntegrationToken.update(tokenRecord.id, {
      refresh_token: tokenData.refresh_token,
      access_token: tokenData.access_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

    // --- Create Xero bill (ACCPAY) ---
    const xeroRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Xero-tenant-id': Deno.env.get('XERO_TENANT_ID'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Invoices: [{
          Type: 'ACCPAY',
          Contact: { Name: si.supplier || 'Unknown Supplier' },
          LineItems: [{
            Description: `${si.charge_type || 'Waste service'} — ${si.material || 'General'}`,
            Quantity: 1,
            UnitAmount: si.total || 0,
            AccountCode: '500',
          }],
          Date: si.date || new Date().toISOString().split('T')[0],
          DueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          InvoiceNumber: si.invoice_no,
          Status: 'AUTHORISED',
        }],
      }),
    });

    if (!xeroRes.ok) {
      const errText = await xeroRes.text();
      console.error('Xero bill creation failed:', errText);
      return Response.json({ error: `Xero bill creation failed: ${errText}` }, { status: 500 });
    }

    const xeroData = await xeroRes.json();
    const xeroBillId = xeroData.Invoices?.[0]?.InvoiceID;

    if (xeroBillId) {
      await base44.asServiceRole.entities.SupplierInvoice.update(si.id || si._id, {
        xero_bill_id: xeroBillId,
        payment_status: 'unpaid',
      });
    }

    // --- Post supplier payment details to Slack for action ---
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
            text: `:moneybag: *Supplier Payment Ready*\n\n*Supplier:* ${si.supplier}\n*Invoice:* ${si.invoice_no}\n*Amount:* $${(si.total || 0).toFixed(2)}\n*Xero Bill:* ${xeroBillId ? 'Synced ✅' : 'Failed ❌'}\n*Material:* ${si.material || 'N/A'}\n\nBill has been recorded in Xero. Process payment via Revolut.`,
          }),
        });
      }
    } catch (e) {
      console.error('Slack notification failed:', e.message);
    }

    return Response.json({ success: true, xero_bill_id: xeroBillId });
  } catch (error) {
    console.error('xeroSyncBillAndPay error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});