import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = { maintenance_created: 0, jobs_reassigned: 0, vehicles_quarantined: 0 };

    for (const v of vehicles) {
      const needsMaintenance =
        (v.health_pct != null && v.health_pct < 60) ||
        (v.next_service && new Date(v.next_service) < today) ||
        v.status === 'maintenance';

      if (!needsMaintenance) continue;

      // Check if maintenance job already exists
      const existing = await base44.asServiceRole.entities.Job.filter({
        vehicle_id: v.vehicle_id,
        job_type: 'maintenance',
        status: { $in: ['created', 'scheduled', 'assigned'] },
      }).catch(() => []);

      if (existing.length === 0) {
        const priority = (v.health_pct != null && v.health_pct < 40) ? 'high' : 'normal';
        await base44.asServiceRole.entities.Job.create({
          job_id: `MAINT-${v.vehicle_id}-${Date.now().toString(36)}`,
          title: `Auto-scheduled maintenance — ${v.vehicle_id}`,
          client: 'Internal',
          job_type: 'maintenance',
          status: 'created',
          vehicle_id: v.vehicle_id,
          priority,
          notes: `Auto-generated: ${v.health_pct != null && v.health_pct < 60 ? `health at ${v.health_pct}%` : 'service overdue'}.`,
        });
        results.maintenance_created++;
      }

      // Quarantine vehicle
      if (v.status !== 'maintenance') {
        await base44.asServiceRole.entities.Vehicle.update(v.id, { status: 'maintenance' });
        results.vehicles_quarantined++;
      }

      // Reassign pending jobs to idle vehicles
      const pendingJobs = await base44.asServiceRole.entities.Job.filter({
        vehicle_id: v.vehicle_id,
        status: { $in: ['created', 'scheduled', 'assigned'] },
        job_type: { $ne: 'maintenance' },
      }).catch(() => []);

      if (pendingJobs.length > 0) {
        const idleVehicles = await base44.asServiceRole.entities.Vehicle.filter({ status: 'idle' });

        for (const job of pendingJobs) {
          if (idleVehicles.length === 0) break;
          const backup = idleVehicles[0];
          await base44.asServiceRole.entities.Job.update(job.id, { vehicle_id: backup.vehicle_id });
          await base44.asServiceRole.entities.Vehicle.update(backup.id, { status: 'active' });
          // Remove from idle pool
          idleVehicles.splice(0, 1);
          results.jobs_reassigned++;
        }
      }
    }

    // Send summary to Slack
    if (results.maintenance_created > 0 || results.jobs_reassigned > 0) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('slack');
        const channels = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(r => r.json());
        const opsChannel = channels.channels?.find(c => c.name.toLowerCase().includes('operations') || c.name.toLowerCase().includes('ops'));
        if (opsChannel) {
          const msg = `:gear: *Auto-Maintenance Summary*\n• ${results.maintenance_created} maintenance jobs created\n• ${results.vehicles_quarantined} vehicles quarantined\n• ${results.jobs_reassigned} jobs reassigned to backup vehicles`;
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: opsChannel.id, text: msg }),
          });
        }
      } catch (e) {
        console.error('Slack notification failed:', e.message);
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});