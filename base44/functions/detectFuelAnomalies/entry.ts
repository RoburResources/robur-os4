import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const vehicles = await base44.asServiceRole.entities.Vehicle.list('-updated_date', 100);
    const dockets = await base44.asServiceRole.entities.Docket.filter({ status: 'validated' });

    const docketsPerVehicle = {};
    dockets.forEach(d => {
      if (!d.vehicle) return;
      docketsPerVehicle[d.vehicle] = (docketsPerVehicle[d.vehicle] || 0) + 1;
    });

    const allVehicles = vehicles.map(v => {
      const jobCount = docketsPerVehicle[v.vehicle_id] || 0;
      const expectedFuelUsed = jobCount * 5;
      const actualFuelUsed = 100 - (v.fuel_pct ?? 100);
      const variance = actualFuelUsed - expectedFuelUsed;
      const isAnomaly = variance > 15 || (actualFuelUsed > 20 && jobCount === 0);
      return {
        vehicle_id: v.vehicle_id,
        driver: v.driver,
        fuel_pct: v.fuel_pct,
        adblue_pct: v.adblue_pct,
        jobs_completed: jobCount,
        expected_fuel_used: expectedFuelUsed,
        actual_fuel_used: Math.round(actualFuelUsed),
        variance: Math.round(variance),
        anomaly: isAnomaly,
        severity: variance > 30 ? 'critical' : variance > 15 ? 'warning' : 'normal'
      };
    });

    const anomalies = allVehicles.filter(a => a.anomaly);

    return Response.json({ anomalies, all_vehicles: allVehicles, total_vehicles: vehicles.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});