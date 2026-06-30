import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find all created jobs that haven't been assigned a vehicle
    const unassignedJobs = await base44.asServiceRole.entities.Job.filter({ status: 'created' });

    const results = { dispatched: 0, still_pending: 0, no_vehicles: 0 };

    for (const job of unassignedJobs) {
      // Skip maintenance jobs — they're internal
      if (job.job_type === 'maintenance') continue;
      if (job.vehicle_id) continue;

      // Find idle vehicles
      const idleVehicles = await base44.asServiceRole.entities.Vehicle.filter({ status: 'idle' });

      if (idleVehicles.length === 0) {
        results.no_vehicles++;
        continue;
      }

      // Find nearest vehicle if job has coordinates
      let assignedVehicle = idleVehicles[0];
      if (job.latitude && job.longitude) {
        let minDist = Infinity;
        for (const v of idleVehicles) {
          if (v.latitude && v.longitude) {
            const dist = Math.sqrt(
              Math.pow(v.latitude - job.latitude, 2) + Math.pow(v.longitude - job.longitude, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              assignedVehicle = v;
            }
          }
        }
      }

      // Assign vehicle and advance status
      await base44.asServiceRole.entities.Job.update(job.id, {
        vehicle_id: assignedVehicle.vehicle_id,
        status: 'assigned',
      });

      // Set vehicle to active
      await base44.asServiceRole.entities.Vehicle.update(assignedVehicle.id, { status: 'active' });
      results.dispatched++;
    }

    // If there are still pending jobs with no vehicles, notify Slack once
    if (results.no_vehicles > 0) {
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
              text: `:warning: *Dispatch Backlog* — ${results.no_vehicles} job(s) waiting for idle vehicles. Consider completing current jobs or adding capacity.`,
            }),
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