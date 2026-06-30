import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// --- JWT helpers (Web Crypto API, no external deps) ---

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN[^-]*-----/g, '')
    .replace(/-----END[^-]*-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64url(input) {
  let str;
  if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
    str = String.fromCharCode.apply(null, bytes);
  } else {
    str = input;
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signRevolutJWT(clientId, issuer, privateKeyPem) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: issuer,
    sub: clientId,
    aud: 'https://revolut.com',
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);

  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

const API_BASE = 'https://merchant.revolut.com/api/1.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    // No code → return the consent URL the user should visit
    if (!code) {
      const clientId = Deno.env.get('REVOLUT_CLIENT_ID');
      const redirectUri = `${url.origin}${url.pathname}`;
      const consentUrl = `https://business.revolut.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
      return Response.json({
        message: 'Visit the consent_url to authorize the app, then Revolut will redirect back here with the auth code.',
        consent_url: consentUrl,
        redirect_uri: redirectUri,
      });
    }

    // Exchange authorization code for access token
    const clientId = Deno.env.get('REVOLUT_CLIENT_ID');
    const issuer = Deno.env.get('REVOLUT_ISSUER');
    const privateKeyPem = Deno.env.get('REVOLUT_PRIVATE_KEY');
    if (!clientId || !issuer || !privateKeyPem) {
      return Response.json({ error: 'Revolut OAuth secrets not configured' }, { status: 500 });
    }

    const redirectUri = `${url.origin}${url.pathname}`;
    const jwt = await signRevolutJWT(clientId, issuer, privateKeyPem);

    const tokenRes = await fetch(`${API_BASE}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_assertion: jwt,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Revolut token exchange failed:', errText);
      return Response.json({ error: `Token exchange failed: ${errText}` }, { status: 502 });
    }

    const tokenData = await tokenRes.json();

    // Store tokens in IntegrationToken entity
    const existing = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'revolut' });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.IntegrationToken.update(existing[0].id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.IntegrationToken.create({
        service: 'revolut',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      });
    }

    return new Response(
      '<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f7f7f7"><div style="text-align:center"><h1 style="color:#22262B">✅ Revolut Connected</h1><p style="color:#5E6770">Your Revolut Business account is now linked. You can close this tab.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('revolutOAuthCallback error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});