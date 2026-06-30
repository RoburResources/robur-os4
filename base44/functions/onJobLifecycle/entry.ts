import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data, changed_fields } = body;

    if (!event || !event.type) {
      return Response.json({ error: 'Invalid event payload' }, { status: 400 });
    }

    const eventType = event.type; // 'create' | 'update' | 'delete'
    const job = data;
    const results = [];

    // --- Event Bus: each handler is independent; failures don't block others ---
    // Note: Google Calendar sync is handled by its own entity automation (Sync Jobs to Google Calendar)
    // so we don't invoke syncJobToCalendar here to avoid redundancy.

    // 1. Notify client when job is completed
    if (eventType === 'update' && changed_fields?.includes('status') && job?.status === 'completed') {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ name: job.client });
        const clientEmail = clients[0]?.contact_email;
        if (clientEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: clientEmail,
            subject: `Job Completed — ${job.title}`,
            body: `Your job ${job.job_id} (${job.title}) has been completed.\n\nSite: ${job.site_address || 'N/A'}\n\nThank you for choosing Robur Resources.\n\nRobur Resources`,
          });
          results.push({ handler: 'clientNotification', status: 'ok' });
        } else {
          results.push({ handler: 'clientNotification', status: 'skipped', reason: 'no_client_email' });
        }
      } catch (e) {
        results.push({ handler: 'clientNotification', status: 'error', error: e.message });
      }
    }

    // 2. Send email to client when job is dispatched
    if (eventType === 'update' && changed_fields?.includes('status') && job?.status === 'dispatched') {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ name: job.client });
        const clientEmail = clients[0]?.contact_email;
        if (clientEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: clientEmail,
            subject: `Vehicle Dispatched — ${job.title}`,
            body: `Your job ${job.job_id} (${job.title}) is now in progress.\n\nVehicle ${job.vehicle_id || ''} has been dispatched to your site.\nSite: ${job.site_address || 'N/A'}\n\nRobur Resources`,
          });
          results.push({ handler: 'dispatchEmail', status: 'ok' });
        } else {
          results.push({ handler: 'dispatchEmail', status: 'skipped', reason: 'no_client_email' });
        }
      } catch (e) {
        results.push({ handler: 'dispatchEmail', status: 'error', error: e.message });
      }
    }

    // 3. Log all lifecycle events for audit trail
    try {
      console.log(`[JobLifecycle] ${eventType} — Job ${job?.job_id || event.entity_id}`);
      results.push({ handler: 'auditLog', status: 'ok' });
    } catch (e) {
      results.push({ handler: 'auditLog', status: 'error', error: e.message });
    }

    return Response.json({ status: 'processed', event_type: eventType, handlers: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});