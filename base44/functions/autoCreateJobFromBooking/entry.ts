import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const booking = body.data || body;

    // Check if job already exists for this booking
    const existing = await base44.asServiceRole.entities.Job.filter({
      job_id: `BK-${booking.id}`,
    }).catch(() => []);

    if (existing.length > 0) {
      return Response.json({ skipped: true, reason: 'job already exists for booking' });
    }

    // Auto-create job from booking — triggers autoDispatch via entity automation
    const job = await base44.asServiceRole.entities.Job.create({
      job_id: `BK-${booking.id}`,
      title: `${booking.service_type} — ${booking.action_type || 'Service'}`,
      client: booking.client_name || 'Portal Booking',
      job_type: booking.service_type,
      status: 'created',
      site_address: booking.site_address,
      contact_name: booking.contact_name,
      contact_phone: booking.contact_phone,
      latitude: booking.latitude,
      longitude: booking.longitude,
      notes: booking.placement_notes || `Auto-created from booking. Preferred date: ${booking.preferred_date || 'ASAP'}`,
      priority: 'normal',
    });

    // Mark booking as confirmed
    await base44.asServiceRole.entities.Booking.update(booking.id, { status: 'confirmed' });

    return Response.json({ success: true, job_id: job.job_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});