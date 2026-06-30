import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("slack");

    // Find the operations channel
    let channelId = null;
    let cursor = "";
    for (let i = 0; i < 10; i++) {
      const url = cursor
        ? `https://slack.com/api/conversations.list?types=public_channel&limit=200&cursor=${cursor}`
        : `https://slack.com/api/conversations.list?types=public_channel&limit=200`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await resp.json();
      if (!data.ok) break;
      const found = data.channels.find(c =>
        c.name.toLowerCase().includes("operations") || c.name.toLowerCase().includes("ops") ||
        c.name.toLowerCase().includes("fleet") || c.name.toLowerCase().includes("robur")
      );
      if (found) { channelId = found.id; break; }
      if (!data.response_metadata?.next_cursor) break;
      cursor = data.response_metadata.next_cursor;
    }

    if (!channelId) {
      return Response.json({ error: "No operations channel found. Create a channel named 'operations' or 'ops'." }, { status: 404 });
    }

    // Check vehicles for alerts
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const alerts = [];
    const maintenanceJobs = [];

    for (const v of vehicles) {
      if (v.fuel_pct != null && v.fuel_pct < 25) {
        alerts.push(`:fuel_pump: *Low Fuel* — ${v.vehicle_id} (${v.type}) at ${v.fuel_pct}% fuel`);
      }
      if (v.adblue_pct != null && v.adblue_pct < 20) {
        alerts.push(`:droplet: *Low AdBlue* — ${v.vehicle_id} (${v.type}) at ${v.adblue_pct}% AdBlue`);
      }
      if (v.status === "maintenance") {
        alerts.push(`:wrench: *In Maintenance* — ${v.vehicle_id} (${v.type}) is currently offline`);
      }
      if (v.next_service) {
        const serviceDate = new Date(v.next_service);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) {
          alerts.push(`:calendar: *Service Due* — ${v.vehicle_id} (${v.type}) ${daysUntil <= 0 ? 'is OVERDUE for service' : `service due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}`);

          // Auto-create maintenance job if overdue and no existing one
          if (daysUntil <= 0) {
            const existing = await base44.asServiceRole.entities.Job.filter({
              vehicle_id: v.vehicle_id,
              job_type: "maintenance",
              status: { $in: ["created", "scheduled", "assigned"] }
            }).catch(() => []);

            if (existing.length === 0) {
              const job = await base44.asServiceRole.entities.Job.create({
                job_id: `MAINT-${v.vehicle_id}-${Date.now().toString(36)}`,
                title: `Scheduled maintenance — ${v.vehicle_id}`,
                client: "Internal",
                job_type: "maintenance",
                status: "created",
                vehicle_id: v.vehicle_id,
                priority: "high",
                notes: `Auto-generated: service overdue. Vehicle type: ${v.type}.`,
              });
              maintenanceJobs.push(job.job_id);
            }
          }
        }
      }
      // Proactive: auto-create maintenance job when health drops below 60%
      if (v.health_pct != null && v.health_pct < 60) {
        alerts.push(`:warning: *Vehicle Health* — ${v.vehicle_id} (${v.type}) health at ${v.health_pct}%`);

        const existing = await base44.asServiceRole.entities.Job.filter({
          vehicle_id: v.vehicle_id,
          job_type: "maintenance",
          status: { $in: ["created", "scheduled", "assigned"] }
        }).catch(() => []);

        if (existing.length === 0) {
          const job = await base44.asServiceRole.entities.Job.create({
            job_id: `MAINT-${v.vehicle_id}-${Date.now().toString(36)}`,
            title: `Health check — ${v.vehicle_id}`,
            client: "Internal",
            job_type: "maintenance",
            status: "created",
            vehicle_id: v.vehicle_id,
            priority: v.health_pct < 40 ? "high" : "normal",
            notes: `Auto-generated: vehicle health at ${v.health_pct}%.`,
          });
          maintenanceJobs.push(job.job_id);
        }
      }
      // Proactive: auto-create maintenance job when odometer exceeds service interval (every 10,000 km)
      if (v.odometer != null && v.odometer > 0 && v.odometer % 10000 < 100) {
        const existing = await base44.asServiceRole.entities.Job.filter({
          vehicle_id: v.vehicle_id,
          job_type: "maintenance",
          status: { $in: ["created", "scheduled", "assigned"] }
        }).catch(() => []);

        if (existing.length === 0) {
          const job = await base44.asServiceRole.entities.Job.create({
            job_id: `MAINT-${v.vehicle_id}-${Date.now().toString(36)}`,
            title: `Odometer service — ${v.vehicle_id}`,
            client: "Internal",
            job_type: "maintenance",
            status: "created",
            vehicle_id: v.vehicle_id,
            priority: "normal",
            notes: `Auto-generated: odometer at ${v.odometer} km.`,
          });
          maintenanceJobs.push(job.job_id);
        }
      }
    }

    // Add summary of auto-created maintenance jobs to alerts
    if (maintenanceJobs.length > 0) {
      alerts.unshift(`:gear: *${maintenanceJobs.length} maintenance job${maintenanceJobs.length === 1 ? '' : 's'} auto-created*`);
    }

    if (alerts.length === 0) {
      return Response.json({ status: "no_alerts", alerts: 0 });
    }

    const nowStr = new Date().toLocaleString("en-AU", { timeZone: "Australia/Perth", dateStyle: "medium", timeStyle: "short" });
    const message = `:rotating_light: *Vehicle Alerts — ${nowStr}*\n\n${alerts.join("\n")}`;

    // Try to join the channel first (in case the user isn't a member yet)
    await fetch("https://slack.com/api/conversations.join", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channelId })
    });

    const postResp = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: channelId, text: message })
    });
    const result = await postResp.json();

    return Response.json({ status: "sent", alerts: alerts.length, channel: channelId, ok: result.ok });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});