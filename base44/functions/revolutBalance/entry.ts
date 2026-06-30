import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// --- JWT + token helpers ---

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

async function getRevolutAccessToken(base44) {
  const clientId = Deno.env.get('REVOLUT_CLIENT_ID');
  const issuer = Deno.env.get('REVOLUT_ISSUER');
  const privateKeyPem = Deno.env.get('REVOLUT_PRIVATE_KEY');
  if (!clientId || !issuer || !privateKeyPem) {
    throw new Error('Revolut OAuth secrets not configured');
  }

  const tokens = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'revolut' });
  if (tokens.length === 0) {
    throw new Error('No Revolut token found. Complete OAuth consent via the revolutOAuthCallback function first.');
  }
  const tokenRecord = tokens[0];

  // Return cached token if still valid (60s buffer)
  const expiresAt = new Date(tokenRecord.expires_at).getTime();
  if (tokenRecord.access_token && expiresAt > Date.now() + 60000) {
    return tokenRecord.access_token;
  }

  // Refresh the token
  const jwt = await signRevolutJWT(clientId, issuer, privateKeyPem);
  const refreshRes = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refresh_token,
      client_id: clientId,
      client_assertion: jwt,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    }),
  });

  if (!refreshRes.ok) {
    const errText = await refreshRes.text();
    throw new Error(`Revolut token refresh failed: ${errText}`);
  }

  const tokenData = await refreshRes.json();
  await base44.asServiceRole.entities.IntegrationToken.update(tokenRecord.id, {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  });

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const accessToken = await getRevolutAccessToken(base44);

    // --- Fetch Revolut accounts ---
    const accountsRes = await fetch(`${API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!accountsRes.ok) {
      const errText = await accountsRes.text();
      console.error('Revolut accounts API error:', errText);
      return Response.json({ error: `Revolut API error: ${errText}` }, { status: 502 });
    }

    const accounts = await accountsRes.json();
    const activeAccounts = (Array.isArray(accounts) ? accounts : []).filter(a => a.state === 'active');
    const totalBalance = activeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const primaryCurrency = activeAccounts[0]?.currency || 'AUD';

    // --- Fetch recent transactions (last 7 days) ---
    const fromDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const txRes = await fetch(`${API_BASE}/transactions?from=${fromDate}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let recentTransactions = [];
    if (txRes.ok) {
      const txData = await txRes.json();
      recentTransactions = (Array.isArray(txData) ? txData : [])
        .filter(t => t.state === 'completed')
        .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))
        .slice(0, 8)
        .map(t => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
          type: t.type,
          description: t.description || t.reference || 'Bank transaction',
          date: t.completed_at || t.created_at,
        }));
    }

    // --- Xero sync stats ---
    const allInvoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 100);
    const xeroSyncedInvoices = allInvoices.filter(i => i.xero_invoice_id).length;

    const allBills = await base44.asServiceRole.entities.SupplierInvoice.list('-created_date', 100);
    const xeroSyncedBills = allBills.filter(b => b.xero_bill_id).length;

    return Response.json({
      balance: totalBalance,
      currency: primaryCurrency,
      accounts: activeAccounts.map(a => ({ name: a.name, balance: a.balance, currency: a.currency })),
      recent_transactions: recentTransactions,
      xero: {
        invoices_synced: xeroSyncedInvoices,
        invoices_total: allInvoices.length,
        bills_synced: xeroSyncedBills,
        bills_total: allBills.length,
      },
    });
  } catch (error) {
    console.error('revolutBalance error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});