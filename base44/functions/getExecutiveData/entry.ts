import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC: Only admins can access executive dashboard data
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 });
    }

    // Fetch all data in parallel
    const [jobs, vehicles, dockets] = await Promise.all([
      base44.entities.Job.list().catch(() => []),
      base44.entities.Vehicle.list().catch(() => []),
      base44.entities.Docket.list('-created_date', 20).catch(() => []),
    ]);

    // Compute metrics
    const activeJobs = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
    const completedThisMonth = jobs.filter((j) => {
      if (j.status !== 'completed') return false;
      const d = new Date(j.updated_date || j.created_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const activeVehicles = vehicles.filter((v) => v.status === 'active');
    const vehiclesNeedingAttention = vehicles.filter((v) =>
      (v.health_pct != null && v.health_pct < 60) ||
      (v.fuel_pct != null && v.fuel_pct < 25) ||
      v.status === 'maintenance'
    );

    const fleetUtilisation = vehicles.length > 0
      ? Math.round((activeVehicles.length / vehicles.length) * 100)
      : 0;

    const onTimeJobs = completedThisMonth.filter((j) => {
      if (!j.scheduled_time) return true;
      return new Date(j.updated_date || j.created_date) <= new Date(j.scheduled_time);
    });
    const onTimeRate = completedThisMonth.length > 0
      ? Math.round((onTimeJobs.length / completedThisMonth.length) * 100)
      : 100;

    // Build alerts from fleet data
    const alerts = [];
    for (const v of vehiclesNeedingAttention) {
      if (v.health_pct != null && v.health_pct < 50) {
        alerts.push({ severity: 'critical', message: `${v.vehicle_id} health critical at ${v.health_pct}%`, time: 'now' });
      }
      if (v.fuel_pct != null && v.fuel_pct < 25) {
        alerts.push({ severity: 'warning', message: `${v.vehicle_id} low fuel at ${v.fuel_pct}%`, time: 'now' });
      }
      if (v.status === 'maintenance') {
        alerts.push({ severity: 'warning', message: `${v.vehicle_id} in maintenance`, time: 'now' });
      }
    }

    // Build recent activity from recent jobs
    const activity = jobs
      .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
      .slice(0, 8)
      .map((j) => ({
        action: j.status === 'completed' ? 'Job Completed' : j.status === 'dispatched' ? 'Vehicle Dispatched' : 'Job Updated',
        detail: `${j.job_id} · ${j.client || 'Unknown'}`,
        time: getRelativeTime(new Date(j.updated_date || j.created_date)),
      }));

    return Response.json({
      metrics: {
        activeJobs: activeJobs.length,
        completedThisMonth: completedThisMonth.length,
        fleetUtilisation,
        onTimeRate,
        totalVehicles: vehicles.length,
        activeVehicles: activeVehicles.length,
        vehiclesNeedingAttention: vehiclesNeedingAttention.length,
      },
      alerts,
      activity,
      recentDockets: dockets.slice(0, 5),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}