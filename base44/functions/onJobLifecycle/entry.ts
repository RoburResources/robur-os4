import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event, data, old_data, changed_fields } = body;

    if (!event || !event.type) {
      return Response.json({ error: 'Invalid event payload' }, { status: 400 });
    }

    const eventType = event.type; // 'create' | 'update' | 'delete'
    const job = data;
    const results = [];

    // --- Event Bus: each handler is independent; failures don't block others ---

    // 1. Sync to Google Calendar (on create, update, delete)
    if (['create', 'update', 'delete'].includes(eventType)) {
      try {
        await base44.functions.invoke('syncJobToCalendar', {
          event_type: eventType,
          job: job,
          old_data: old_data,
        });
        results.push({ handler: 'syncJobToCalendar', status: 'ok' });
      } catch (e) {
        results.push({ handler: 'syncJobToCalendar', status: 'error', error: e.message });
      }
    }

    // 2. Notify client when job is completed
    if (eventType === 'update' && changed_fields?.includes('status') && job?.status === 'completed' && job?.contact_phone) {
      try {
        // Could integrate with SMS provider here; for now, log
        results.push({ handler: 'clientNotification', status: 'skipped', reason: 'no_sms_provider' });
      } catch (e) {
        results.push({ handler: 'clientNotification', status: 'error', error: e.message });
      }
    }

    // 3. Send email to client when job is dispatched
    if (eventType === 'update' && changed_fields?.includes('status') && job?.status === 'dispatched') {
      try {
        // Email notification could be sent here via SendEmail integration
        results.push({ handler: 'dispatchEmail', status: 'skipped', reason: 'no_client_email' });
      } catch (e) {
        results.push({ handler: 'dispatchEmail', status: 'error', error: e.message });
      }
    }

    // 4. Log all lifecycle events for audit trail
    try {
      console.log(`[JobLifecycle] ${eventType} — Job ${job?.job_id || event.entity_id} — by ${user.email}`);
      results.push({ handler: 'auditLog', status: 'ok' });
    } catch (e) {
      results.push({ handler: 'auditLog', status: 'error', error: e.message });
    }

    return Response.json({ status: 'processed', event_type: eventType, handlers: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});