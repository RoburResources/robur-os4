import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateInvoiceNo() {
  return `INV-${crypto.getRandomValues(new Uint8Array(4)).reduce((a, b) => a + b.toString(16).padStart(2, '0'), '')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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

    // Validate net weight
    const netWeight = docket.net_weight || 0;
    if (netWeight <= 0) {
      return Response.json({ error: 'Docket net_weight must be greater than zero' }, { status: 400 });
    }

    // Look up rate card for the material
    const rateCards = await base44.asServiceRole.entities.RateCard.filter({ material: docket.material });
    if (rateCards.length === 0) {
      return Response.json({ error: `No rate card found for material: ${docket.material}` }, { status: 400 });
    }
    const rateCard = rateCards[0];
    const rate = rateCard.base_rate_per_tonne;
    const minCharge = rateCard.minimum_charge || 150;

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

    const invoiceNo = generateInvoiceNo();
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

    console.log(`Invoice created: ${invoiceNo} for docket ${docket.docket_no}, total: $${total.toFixed(2)}`);

    // Try to send email, but don't fail invoice creation if it fails
    let emailSent = false;
    try {
      const clients = await base44.asServiceRole.entities.Client.filter({ name: invoice.client });
      const clientEmail = clients[0]?.contact_email;
      if (clientEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: clientEmail,
          subject: `Invoice ${invoiceNo} from Robur Resources`,
          body: `Your invoice ${invoiceNo} for $${total.toFixed(2)} is now available.\n\nAmount due: $${total.toFixed(2)} (incl. GST)\nDue date: ${dueDate}\n\nA payment link will follow shortly.\n\nThank you for your business.\nRobur Resources`,
        });
        emailSent = true;
        console.log(`Email sent to ${clientEmail} for invoice ${invoiceNo}`);
      } else {
        console.warn(`No email found for client: ${invoice.client}`);
      }
    } catch (e) {
      console.error(`Email send failed for invoice ${invoiceNo}: ${e.message}`);
    }

    // Update status: mark 'sent' only if email succeeded
    const newStatus = emailSent ? 'sent' : 'draft';
    const updateData = emailSent ? { status: 'sent', client_email: clients?.[0]?.contact_email } : {};
    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.Invoice.update(invoice.id, updateData);
    }

    return Response.json({ success: true, invoice, emailSent });
  } catch (error) {
    console.error(`Invoice generation failed: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});