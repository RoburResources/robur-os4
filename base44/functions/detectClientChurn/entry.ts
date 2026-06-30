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

    return Response.json({ alerts, total_clients: Object.keys(clientMap).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});