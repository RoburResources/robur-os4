import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { site_address, service_type, preferred_date, vehicle_id } = await req.json();

    // Fetch historical jobs for context
    const recentJobs = await base44.entities.Job.list('-created_date', 100).catch(() => []);

    // Build context for the LLM
    const completedJobs = recentJobs.filter((j) => j.status === 'completed');
    const avgDuration = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          if (!j.scheduled_time) return sum;
          const start = new Date(j.scheduled_time);
          const end = new Date(j.updated_date || j.created_date);
          return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
        }, 0) / completedJobs.length
      : 2; // default 2 hours

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a scheduling optimizer for a waste management and resource logistics company in Perth, Western Australia.

Given:
- Site address: ${site_address}
- Service type: ${service_type}
- Preferred date: ${preferred_date || 'not specified'}
- Average job duration from history: ${avgDuration.toFixed(1)} hours
- Recent completed jobs: ${completedJobs.length}
- Recent jobs near this area: ${recentJobs.filter(j => j.site_address?.toLowerCase().includes((site_address || '').split(' ')[0]?.toLowerCase() || '___')).length}

Based on typical Perth traffic patterns, historical job durations, and optimal dispatch times, suggest:
1. The best arrival window (morning 7-9am, mid-morning 9-11am, midday 11am-1pm, afternoon 1-3pm, late 3-5pm)
2. Estimated job duration in hours
3. A specific recommended start time
4. Any routing considerations

Keep the response concise and actionable.`,
      response_json_schema: {
        type: 'object',
        properties: {
          recommended_window: { type: 'string' },
          estimated_duration_hours: { type: 'number' },
          recommended_start_time: { type: 'string' },
          routing_notes: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
      model: 'gemini_3_flash',
      add_context_from_internet: true,
    });

    return Response.json({ prediction: llmResponse, historical_avg_duration_hours: avgDuration });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});