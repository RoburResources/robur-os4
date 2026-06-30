import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const jobs = await base44.asServiceRole.entities.Job.list('-created_date', 500);
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const clientMap = {};
    jobs.forEach(j => {
      if (!j.client) return;
      if (!clientMap[j.client]) {
        clientMap[j.client] = { recent: 0, prior: 0, total: 0, lastJob: null };
      }
      clientMap[j.client].total++;
      const jobDate = j.created_date ? new Date(j.created_date) : null;
      if (jobDate) {
        if (jobDate >= ninetyDaysAgo) clientMap[j.client].recent++;
        if (jobDate >= oneEightyDaysAgo && jobDate < ninetyDaysAgo) clientMap[j.client].prior++;
        if (!clientMap[j.client].lastJob || jobDate > clientMap[j.client].lastJob) {
          clientMap[j.client].lastJob = jobDate;
        }
      }
    });

    const alerts = Object.entries(clientMap)
      .map(([client, d]) => {
        const baseline = d.prior / 90;
        const current = d.recent / 90;
        const dropPct = baseline > 0 ? ((baseline - current) / baseline) * 100 : 0;
        const riskLevel = dropPct > 50 ? 'critical' : dropPct > 30 ? 'warning' : 'healthy';
        return {
          client,
          recent_jobs: d.recent,
          prior_jobs: d.prior,
          total_jobs: d.total,
          drop_pct: Math.round(dropPct),
          risk_level: riskLevel,
          last_job: d.lastJob ? d.lastJob.toISOString().split('T')[0] : 'unknown'
        };
      })
      .sort((a, b) => b.drop_pct - a.drop_pct);

    // Auto-send outreach emails to at-risk clients
    const outreachSent = [];
    for (const alert of alerts) {
      if (alert.risk_level === 'critical' || alert.risk_level === 'warning') {
        try {
          const clients = await base44.asServiceRole.entities.Client.filter({ name: alert.client });
          const clientEmail = clients[0]?.contact_email;
          if (clientEmail) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: clientEmail,
              subject: 'Checking in from Robur Resources',
              body: `Hi ${alert.client},\n\nWe've noticed it's been a little while since your last service with us. We value your partnership and wanted to reach out to see if there's anything we can help with.\n\nPlease don't hesitate to contact us if you need any waste management or resource recovery services.\n\nBest regards,\nRobur Resources Team`,
            });
            outreachSent.push(alert.client);
          }
        } catch (e) {
          console.error(`Failed to send outreach email to ${alert.client}:`, e.message);
        }
      }
    }

    return Response.json({ alerts, total_clients: Object.keys(clientMap).length, outreach_sent: outreachSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});