import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const apiKey = Deno.env.get('REVOLUT_API_KEY');
    if (!apiKey) return Response.json({ error: 'REVOLUT_API_KEY not set' }, { status: 500 });

    // --- Fetch Revolut accounts ---
    const accountsRes = await fetch('https://merchant.revolut.com/api/1.0/accounts', {
      headers: { Authorization: `Bearer ${apiKey}` },
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
    const txRes = await fetch(`https://merchant.revolut.com/api/1.0/transactions?from=${fromDate}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
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