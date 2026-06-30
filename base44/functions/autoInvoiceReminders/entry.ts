import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split('T')[0];
    const results = { auto_sent: 0, marked_overdue: 0, reminders_sent: 0, credit_holds_applied: 0 };

    // 1. Auto-send draft invoices — email client and set to "sent"
    const drafts = await base44.asServiceRole.entities.Invoice.filter({ status: 'draft' });
    for (const inv of drafts) {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ name: inv.client });
        const clientEmail = clients[0]?.contact_email;
        if (clientEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: clientEmail,
            subject: `Invoice ${inv.invoice_no} from Robur Resources`,
            body: `Your invoice ${inv.invoice_no} is now available.\n\nAmount due: $${inv.total.toFixed(2)} (incl. GST)\nDue date: ${inv.due_date}\n\nThank you for your business.\nRobur Resources`,
          });
        }
        await base44.asServiceRole.entities.Invoice.update(inv.id, { status: 'sent', client_email: clientEmail || '' });
        results.auto_sent++;
      } catch (e) {
        console.error(`Failed to auto-send invoice ${inv.invoice_no}:`, e.message);
      }
    }

    // 2. Mark sent invoices past due_date as overdue
    const sentInvoices = await base44.asServiceRole.entities.Invoice.filter({ status: 'sent' });
    for (const inv of sentInvoices) {
      if (inv.due_date && inv.due_date < today) {
        await base44.asServiceRole.entities.Invoice.update(inv.id, { status: 'overdue' });
        results.marked_overdue++;
      }
    }

    // 3. Send reminder emails for overdue invoices + apply credit holds after 3 reminders
    const overdueInvoices = await base44.asServiceRole.entities.Invoice.filter({ status: 'overdue' });
    const slackReminders = [];
    for (const inv of overdueInvoices) {
      const reminderCount = (inv.reminder_count || 0) + 1;

      if (inv.client_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: inv.client_email,
            subject: `OVERDUE: Invoice ${inv.invoice_no} — Action Required`,
            body: `This is reminder ${reminderCount} for invoice ${inv.invoice_no}.\n\nAmount overdue: $${inv.total.toFixed(2)}\nOriginal due date: ${inv.due_date}\n\nPlease arrange payment as soon as possible to avoid service restrictions.\n\nRobur Resources`,
          });
          results.reminders_sent++;
        } catch (e) {
          // Email failed (external address) — queue for Slack fallback
          slackReminders.push(`:email: *OVERDUE* — ${inv.client} | ${inv.invoice_no} | $${inv.total.toFixed(2)} | Reminder ${reminderCount} | ${inv.client_email}`);
        }
      } else {
        slackReminders.push(`:email: *OVERDUE* — ${inv.client} | ${inv.invoice_no} | $${inv.total.toFixed(2)} | Reminder ${reminderCount} | No email on file`);
      }

      await base44.asServiceRole.entities.Invoice.update(inv.id, { reminder_count: reminderCount });

      // Apply credit hold + service suspension after 2 reminders
      if (reminderCount >= 2) {
        try {
          const clients = await base44.asServiceRole.entities.Client.filter({ name: inv.client });
          if (clients.length > 0 && !clients[0].credit_hold) {
            await base44.asServiceRole.entities.Client.update(clients[0].id, {
              credit_hold: true,
              credit_hold_reason: `Overdue invoice ${inv.invoice_no} — $${inv.total.toFixed(2)}`,
            });
            results.credit_holds_applied++;
            // Notify operations channel about service suspension
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
                    text: `:no_entry: *SERVICE SUSPENSION*\nClient *${inv.client}* has been placed on credit hold after ${reminderCount} unpaid reminder(s).\nInvoice: ${inv.invoice_no} — $${inv.total.toFixed(2)}\nAll future jobs will be held until payment is received.`,
                  }),
                });
              }
            } catch (e) {
              console.error('Slack suspension notice failed:', e.message);
            }
          }
        } catch (e) {
          console.error('Credit hold application failed:', e.message);
        }
      }
    }

    // Send Slack fallback for reminders that couldn't be emailed
    if (slackReminders.length > 0) {
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
              text: `:rotating_light: *Overdue Invoice Reminders — Action Required*\n\n${slackReminders.join('\n')}`,
            }),
          });
        }
      } catch (e) {
        console.error('Slack fallback failed:', e.message);
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});