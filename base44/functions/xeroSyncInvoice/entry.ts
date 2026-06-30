import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const invoice = body.data || body;

    if (!invoice || !invoice.invoice_no) {
      return Response.json({ skipped: true, reason: 'No invoice data' });
    }

    // Skip if already synced to Xero
    if (invoice.xero_invoice_id) {
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

    // --- Build line items ---
    let lineItems = [];
    try {
      const parsed = JSON.parse(invoice.line_items_json || '[]');
      lineItems = (Array.isArray(parsed) ? parsed : [parsed]).map(li => ({
        Description: `Waste removal — ${li.material || 'General'} (Docket: ${li.docket_no || 'N/A'})`,
        Quantity: 1,
        UnitAmount: li.amount || invoice.subtotal || 0,
        AccountCode: '200',
      }));
    } catch {
      lineItems = [{
        Description: 'Waste management services',
        Quantity: 1,
        UnitAmount: invoice.subtotal || 0,
        AccountCode: '200',
      }];
    }

    // --- Create Xero invoice ---
    const xeroRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Xero-tenant-id': Deno.env.get('XERO_TENANT_ID'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Invoices: [{
          Type: 'ACCREC',
          Contact: { Name: invoice.client || 'Unknown Client' },
          LineItems: lineItems,
          Date: invoice.issue_date || new Date().toISOString().split('T')[0],
          DueDate: invoice.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          InvoiceNumber: invoice.invoice_no,
          Status: 'AUTHORISED',
        }],
      }),
    });

    if (!xeroRes.ok) {
      const errText = await xeroRes.text();
      console.error('Xero invoice creation failed:', errText);
      return Response.json({ error: `Xero invoice creation failed: ${errText}` }, { status: 500 });
    }

    const xeroData = await xeroRes.json();
    const xeroInvoiceId = xeroData.Invoices?.[0]?.InvoiceID;

    if (xeroInvoiceId) {
      await base44.asServiceRole.entities.Invoice.update(invoice.id || invoice._id, {
        xero_invoice_id: xeroInvoiceId,
      });
    }

    return Response.json({ success: true, xero_invoice_id: xeroInvoiceId });
  } catch (error) {
    console.error('xeroSyncInvoice error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});