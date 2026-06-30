import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const docket = body.data || body;

    if (docket.status !== 'validated') {
      return Response.json({ skipped: true, reason: 'Docket not validated' });
    }

    // Check if invoice already exists for this docket
    const existing = await base44.asServiceRole.entities.Invoice.filter({ docket_nos: docket.docket_no });
    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'Invoice already exists for this docket' });
    }

    // Look up rate card for the material
    const rateCards = await base44.asServiceRole.entities.RateCard.filter({ material: docket.material });
    const rateCard = rateCards[0];
    const rate = rateCard?.base_rate_per_tonne || 85;
    const minCharge = rateCard?.minimum_charge || 150;

    const netWeight = docket.net_weight || 0;
    const subtotal = Math.max(rate * netWeight, minCharge);
    const gst = subtotal * 0.1;
    const total = subtotal + gst;

    const lineItems = JSON.stringify([{
      docket_no: docket.docket_no,
      material: docket.material,
      net_weight: netWeight,
      rate: rate,
      amount: Math.round(subtotal * 100) / 100
    }]);

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const invoice = await base44.asServiceRole.entities.Invoice.create({
      invoice_no: invoiceNo,
      client: docket.site || 'Unknown',
      docket_nos: docket.docket_no,
      line_items_json: lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100,
      status: 'draft',
      issue_date: today,
      due_date: dueDate
    });

    // Auto-send invoice email to client
    try {
      const clients = await base44.asServiceRole.entities.Client.filter({ name: invoice.client });
      const clientEmail = clients[0]?.contact_email;
      if (clientEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: clientEmail,
          subject: `Invoice ${invoiceNo} from Robur Resources`,
          body: `Your invoice ${invoiceNo} for $${total.toFixed(2)} is now available.\n\nAmount due: $${total.toFixed(2)} (incl. GST)\nDue date: ${dueDate}\n\nA payment link will follow shortly.\n\nThank you for your business.\nRobur Resources`,
        });
        await base44.asServiceRole.entities.Invoice.update(invoice.id, { status: 'sent', client_email: clientEmail });
      }
    } catch (e) {
      console.error('Failed to send invoice email:', e.message);
    }

    return Response.json({ success: true, invoice });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});