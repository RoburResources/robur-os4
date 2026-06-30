import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check if token already exists
    const existing = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'xero' });
    if (existing.length > 0) {
      return Response.json({ success: true, message: 'Token already initialized', token_id: existing[0].id });
    }

    const refreshToken = Deno.env.get('XERO_REFRESH_TOKEN');
    if (!refreshToken) {
      return Response.json({ error: 'XERO_REFRESH_TOKEN secret not set' }, { status: 500 });
    }

    const token = await base44.asServiceRole.entities.IntegrationToken.create({
      service: 'xero',
      refresh_token: refreshToken,
    });

    return Response.json({ success: true, token_id: token.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});