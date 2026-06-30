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

  const expiresAt = new Date(tokenRecord.expires_at).getTime();
  if (tokenRecord.access_token && expiresAt > Date.now() + 60000) {
    return tokenRecord.access_token;
  }

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

    const accessToken = await getRevolutAccessToken(base44);

    const results = { transactions_checked: 0, invoices_matched: 0, xero_payments_recorded: 0 };

    // --- Fetch Revolut transactions (last 3 days) ---
    const fromDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const txRes = await fetch(`${API_BASE}/transactions?from=${fromDate}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!txRes.ok) {
      const errText = await txRes.text();
      return Response.json({ error: `Revolut API error: ${errText}` }, { status: 500 });
    }

    const transactions = await txRes.json();
    const incoming = (Array.isArray(transactions) ? transactions : []).filter(t =>
      t.state === 'completed' && parseFloat(t.amount) > 0 && (t.type === 'receive' || t.type === 'topup' || t.type === 'refund')
    );

    results.transactions_checked = incoming.length;

    // --- Match incoming payments to outstanding invoices ---
    const outstanding = await base44.asServiceRole.entities.Invoice.filter({ status: 'sent' });
    const overdue = await base44.asServiceRole.entities.Invoice.filter({ status: 'overdue' });
    const unpaidInvoices = [...outstanding, ...overdue];

    // --- Get Xero access token ---
    let xeroAccessToken = null;
    const tokens = await base44.asServiceRole.entities.IntegrationToken.filter({ service: 'xero' });
    if (tokens.length > 0) {
      const tokenRecord = tokens[0];
      const refreshRes = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenRecord.refresh_token,
          client_id: Deno.env.get('XERO_CLIENT_ID'),
          client_secret: Deno.env.get('XERO_CLIENT_SECRET'),
        }),
      });
      if (refreshRes.ok) {
        const tokenData = await refreshRes.json();
        xeroAccessToken = tokenData.access_token;
        await base44.asServiceRole.entities.IntegrationToken.update(tokenRecord.id, {
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        });
      }
    }

    // --- Dynamically discover Xero tenant ID ---
    let xeroTenantId = null;
    if (xeroAccessToken) {
      try {
        const connRes = await fetch('https://api.xero.com/connections', {
          headers: { Authorization: `Bearer ${xeroAccessToken}` },
        });
        if (connRes.ok) {
          const connections = await connRes.json();
          if (Array.isArray(connections) && connections.length > 0) {
            xeroTenantId = connections[0].tenantId;
          }
        }
      } catch (e) {
        console.error('Xero tenant discovery failed:', e.message);
      }
    }

    // --- Find Xero bank account ---
    let xeroBankAccountId = null;
    if (xeroAccessToken && xeroTenantId) {
      try {
        const accountsRes = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
          headers: {
            Authorization: `Bearer ${xeroAccessToken}`,
            'Xero-tenant-id': xeroTenantId,
          },
        });
        const accountsData = await accountsRes.json();
        xeroBankAccountId = accountsData.Accounts?.find(a => a.Type === 'BANK')?.AccountID;
      } catch (e) {
        console.error('Xero accounts fetch failed:', e.message);
      }
    }

    for (const tx of incoming) {
      const txAmount = parseFloat(tx.amount);
      const match = unpaidInvoices.find(inv => Math.abs(inv.total - txAmount) < 0.01);
      if (match) {
        await base44.asServiceRole.entities.Invoice.update(match.id, { status: 'paid' });
        results.invoices_matched++;

        const idx = unpaidInvoices.findIndex(inv => inv.id === match.id);
        if (idx > -1) unpaidInvoices.splice(idx, 1);

        try {
          const clients = await base44.asServiceRole.entities.Client.filter({ name: match.client });
          if (clients.length > 0 && clients[0].credit_hold) {
            await base44.asServiceRole.entities.Client.update(clients[0].id, {
              credit_hold: false,
              credit_hold_reason: '',
            });
          }
        } catch (e) {
          console.error('Credit hold removal failed:', e.message);
        }

        if (xeroAccessToken && match.xero_invoice_id && xeroBankAccountId && xeroTenantId) {
          try {
            const paymentRes = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${xeroAccessToken}`,
                'Xero-tenant-id': xeroTenantId,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Payments: [{
                  Invoice: { InvoiceID: match.xero_invoice_id },
                  Account: { AccountID: xeroBankAccountId },
                  Amount: match.total,
                  Date: new Date().toISOString().split('T')[0],
                  Reference: `Revolut: ${tx.id || 'bank transfer'}`,
                }],
              }),
            });
            if (paymentRes.ok) results.xero_payments_recorded++;
          } catch (e) {
            console.error('Xero payment recording failed:', e.message);
          }
        }
      }
    }

    // --- Post reconciliation summary to Slack ---
    if (results.invoices_matched > 0) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('slack');
        const channels = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=200', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(r => r.json());
        const opsChannel = channels.channels?.find(c => c.name.toLowerCase().includes('operations') || c.name.toLowerCase().includes('ops'));
        if (opsChannel) {
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: opsChannel.id,
              text: `:white_check_mark: *Revolut Reconciliation Complete*\n\nTransactions checked: ${results.transactions_checked}\nInvoices auto-matched & paid: ${results.invoices_matched}\nXero payments recorded: ${results.xero_payments_recorded}`,
            }),
          });
        }
      } catch (e) {
        console.error('Slack notification failed:', e.message);
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('revolutReconcile error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});