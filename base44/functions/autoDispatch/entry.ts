import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const job = body.data || body;

    // Skip maintenance jobs — they're internal
    if (job.job_type === 'maintenance' || job.vehicle_id) {
      return Response.json({ skipped: true, reason: 'maintenance or already assigned' });
    }

    // Find idle vehicles
    const idleVehicles = await base44.asServiceRole.entities.Vehicle.filter({ status: 'idle' });

    if (idleVehicles.length === 0) {
      // No idle vehicles — post to Slack so ops can react
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
              text: `:warning: *Auto-dispatch failed* — No idle vehicles available for job ${job.job_id} (${job.title}) for ${job.client}. Job remains unassigned.`,
            }),
          });
        }
      } catch (e) {
        console.error('Slack notification failed:', e.message);
      }
      return Response.json({ skipped: true, reason: 'no idle vehicles', notified: true });
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
    const updated = await base44.asServiceRole.entities.Job.update(job.id, {
      vehicle_id: assignedVehicle.vehicle_id,
      status: 'assigned',
    });

    // Set vehicle to active
    await base44.asServiceRole.entities.Vehicle.update(assignedVehicle.id, { status: 'active' });

    return Response.json({
      success: true,
      assigned_vehicle: assignedVehicle.vehicle_id,
      job_id: updated.job_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});