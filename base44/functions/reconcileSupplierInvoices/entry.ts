import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supplierInvoices = await base44.asServiceRole.entities.SupplierInvoice.filter({ status: 'pending' });
    const dockets = await base44.asServiceRole.entities.Docket.filter({ status: 'validated' });

    const results = [];

    for (const si of supplierInvoices) {
      const matchingDockets = dockets.filter(d => {
        if (si.material && d.material && si.material.toLowerCase() !== d.material.toLowerCase()) return false;
        if (si.weight_charged && d.net_weight) {
          const variance = Math.abs(si.weight_charged - d.net_weight) / Math.max(d.net_weight, 1);
          if (variance > 0.05) return false;
        }
        return true;
      });

      let status = 'matched';
      let notes = '';

      if (matchingDockets.length === 0) {
        status = 'discrepancy';
        notes = 'No matching docket found for this supplier charge';
      } else {
        const hasWeightMismatch = matchingDockets.some(d => {
          if (!si.weight_charged || !d.net_weight) return false;
          return Math.abs(si.weight_charged - d.net_weight) / Math.max(d.net_weight, 1) > 0.02;
        });
        if (hasWeightMismatch) {
          status = 'discrepancy';
          notes = 'Weight mismatch between supplier charge and docket record';
        }
      }

      const matchedDocketNos = matchingDockets.map(d => d.docket_no).join(', ');

      await base44.asServiceRole.entities.SupplierInvoice.update(si.id, {
        status,
        discrepancy_notes: notes,
        matched_docket_nos: matchedDocketNos
      });

      results.push({
        invoice_no: si.invoice_no,
        supplier: si.supplier,
        matched_count: matchingDockets.length,
        status,
        notes
      });
    }

    return Response.json({
      total_processed: results.length,
      matched: results.filter(r => r.status === 'matched').length,
      discrepancies: results.filter(r => r.status === 'discrepancy').length,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});