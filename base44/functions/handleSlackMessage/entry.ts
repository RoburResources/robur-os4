import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const event = body.data?.event || body.event;

    // Only process user messages (skip bot messages, reactions, etc.)
    if (!event || event.type !== 'message' || event.bot_id || event.subtype) {
      return Response.json({ skipped: true, reason: 'not a user message' });
    }

    const messageText = event.text || '';
    const channelId = event.channel;

    if (!messageText || !channelId) {
      return Response.json({ skipped: true, reason: 'missing text or channel' });
    }

    // Use LLM to parse the message and determine intent
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a booking assistant for Robur Resources, a waste management company in Perth, Western Australia.

A client sent the following message via Slack:
"${messageText}"

Determine if this is a booking request for waste services (bin placement, waste removal, skip hire, material transport, etc.).

If it IS a booking request, extract all available details:
- service_type (e.g., "Bin Placement", "Waste Removal", "Skip Hire", "Material Transport")
- action_type (e.g., "Deliver", "Pick Up", "Exchange")
- site_address (full street address)
- contact_name
- contact_phone
- preferred_date (YYYY-MM-DD format, or null if not specified)
- placement_notes (any additional context about access, bin size, material type, etc.)

If it is NOT a booking request, set is_booking to false and provide a helpful suggested reply.

Respond in JSON format.`,
      response_json_schema: {
        type: 'object',
        properties: {
          is_booking: { type: 'boolean' },
          booking_details: {
            type: 'object',
            properties: {
              service_type: { type: 'string' },
              action_type: { type: 'string' },
              site_address: { type: 'string' },
              contact_name: { type: 'string' },
              contact_phone: { type: 'string' },
              preferred_date: { type: 'string' },
              placement_notes: { type: 'string' },
            },
          },
          reply_message: { type: 'string' },
        },
      },
    });

    let replyText = llmResult.reply_message || 'Thank you for your message. How can I help you?';

    // If it's a booking request, create the booking autonomously
    if (llmResult.is_booking && llmResult.booking_details) {
      const details = llmResult.booking_details;

      if (details.service_type && details.site_address) {
        const booking = await base44.asServiceRole.entities.Booking.create({
          service_type: details.service_type,
          action_type: details.action_type || 'Service',
          site_address: details.site_address,
          contact_name: details.contact_name || 'Slack Booking',
          contact_phone: details.contact_phone || '',
          preferred_date: details.preferred_date || null,
          placement_notes: details.placement_notes || `Auto-created from Slack message: "${messageText}"`,
          status: 'pending',
        });

        replyText = `✅ Booking confirmed!\n\nService: ${details.service_type}\nSite: ${details.site_address}\nPreferred Date: ${details.preferred_date || 'ASAP'}\n\nYour booking (ID: ${booking.id}) has been created. A job will be automatically created and dispatched — you'll be notified once a vehicle is assigned.`;
      } else {
        replyText = `I'd like to help you book a service, but I need a few more details:\n\n• What service do you need? (e.g., bin placement, waste removal, skip hire)\n• What is the site address?\n\nPlease provide these details and I'll create the booking for you.`;
      }
    }

    // Post reply to Slack
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slack');

    // Join the channel first (in case the bot isn't a member)
    await fetch('https://slack.com/api/conversations.join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channelId }),
    });

    // Post the reply
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelId,
        text: replyText,
      }),
    });

    return Response.json({ success: true, is_booking: llmResult.is_booking, reply_sent: true });
  } catch (error) {
    console.error('handleSlackMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});