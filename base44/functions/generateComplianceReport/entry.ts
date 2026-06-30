import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { start_date, end_date } = body;

    const dockets = await base44.asServiceRole.entities.Docket.filter({ status: 'validated' });

    const filtered = start_date && end_date
      ? dockets.filter(d => d.date >= start_date && d.date <= end_date)
      : dockets;

    const records = filtered.map(d => ({
      docket_no: d.docket_no,
      date: d.date,
      waste_type: d.material,
      weight_tonnes: d.net_weight,
      origin: d.site,
      carrier: 'Robur Resources',
      vehicle: d.vehicle,
      driver: d.driver,
      chain_of_custody: 'COMPLETE',
      epa_code: `EPA-${d.docket_no}`,
      timestamp: `${d.date} ${d.time_in || ''}`.trim()
    }));

    const summary = {
      total_records: records.length,
      total_weight: Math.round(records.reduce((sum, r) => sum + (r.weight_tonnes || 0), 0) * 100) / 100,
      materials: [...new Set(records.map(r => r.waste_type).filter(Boolean))],
      sites: [...new Set(records.map(r => r.origin).filter(Boolean))],
      generated_at: new Date().toISOString(),
      certifier: user.full_name || 'System'
    };

    return Response.json({ records, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});