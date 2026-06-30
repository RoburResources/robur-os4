import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, changed_fields } = body;

    // Only run on job status change to en_route
    if (event?.type !== 'update') return Response.json({ skipped: true, reason: 'not an update' });
    if (!changed_fields?.includes('status')) return Response.json({ skipped: true, reason: 'status not changed' });
    if (data?.status !== 'en_route') return Response.json({ skipped: true, reason: 'not en_route' });

    const job = data;
    const issues = [];

    // Check vehicle compliance
    if (job.vehicle_id) {
      const vehicles = await base44.asServiceRole.entities.Vehicle.filter({ vehicle_id: job.vehicle_id });
      const vehicle = vehicles[0];

      if (vehicle) {
        if (vehicle.fuel_pct != null && vehicle.fuel_pct < 25) {
          issues.push(`Low fuel: ${vehicle.fuel_pct}%`);
        }
        if (vehicle.adblue_pct != null && vehicle.adblue_pct < 20) {
          issues.push(`Low AdBlue: ${vehicle.adblue_pct}%`);
        }
        if (vehicle.health_pct != null && vehicle.health_pct < 50) {
          issues.push(`Vehicle health critical: ${vehicle.health_pct}%`);
        }
      }
    } else {
      issues.push('No vehicle assigned');
    }

    // Check client credit hold
    if (job.client && job.client !== 'Internal') {
      const clients = await base44.asServiceRole.entities.Client.filter({ name: job.client });
      if (clients[0]?.credit_hold) {
        issues.push(`CLIENT ON CREDIT HOLD: ${clients[0].credit_hold_reason || 'Outstanding balance'}`);
      }
    }

    if (issues.length > 0) {
      // Create a service note flagging the issue
      await base44.asServiceRole.entities.ServiceNote.create({
        driver_name: job.vehicle_id || 'Unassigned',
        vehicle_id: job.vehicle_id || '',
        job_id: job.job_id,
        note_type: 'issue',
        content: `Site compliance check failed: ${issues.join('; ')}`,
        shift_date: new Date().toISOString().split('T')[0],
      });

      // Auto-enforce: email client "Stop Work" notice + place on credit hold
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ name: job.client });
        const client = clients[0];
        if (client) {
          if (client.contact_email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: client.contact_email,
              subject: `STOP WORK NOTICE — Job ${job.job_id}`,
              body: `Work has been automatically suspended for job ${job.job_id} (${job.title}) due to a compliance issue.\n\nIssue: ${issues.join('; ')}\n\nPlease contact Robur Resources to resolve this matter.\n\nRobur Resources`,
            });
          }
          if (!client.credit_hold) {
            await base44.asServiceRole.entities.Client.update(client.id, {
              credit_hold: true,
              credit_hold_reason: `Compliance failure on job ${job.job_id}: ${issues.join('; ')}`,
            });
          }
        }
      } catch (e) {
        console.error('Client enforcement failed:', e.message);
      }

      // Revert job to assigned (stop dispatch)
      try {
        await base44.asServiceRole.entities.Job.update(job.id, { status: 'assigned' });
      } catch (e) {
        console.error('Job revert failed:', e.message);
      }

      // Alert operations via Slack
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
              text: `:warning: *Site Compliance Alert*\nJob ${job.job_id} (${job.client}) en route with issues:\n• ${issues.join('\n• ')}`,
            }),
          });
        }
      } catch (e) {
        console.error('Slack alert failed:', e.message);
      }
    }

    return Response.json({ compliant: issues.length === 0, issues });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});