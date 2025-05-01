require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const cron = require('node-cron');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

let lastSentMessageTs = null; // Track last /sendnow message timestamp

async function sendScheduledMessage(extra = false) {
  const text = extra
    ? 'Go dm me to join <#C08JRG8VCBY>'
    : 'dm me to join <#C08JRG8VCBY> !';
  try {
    const result = await app.client.chat.postMessage({
      channel: process.env.STARTUP_CHANNEL,
      text
    });

    if (extra) {
      lastSentMessageTs = result.ts; // Save message timestamp if /sendnow triggered
    }

    console.log('Sent message:', text);
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

(async () => {
  const port = process.env.PORT || 3000;

  await app.start(port);
  console.log(`Slack bot running on port ${port}`);

  // Send every 6 hours
  cron.schedule('0 */6 * * *', () => {
    sendScheduledMessage();
  });
})();

app.event('message', async ({ event, client }) => {
  if (event.channel_type === 'im' && event.user && !event.bot_id) {
    try {
      await client.conversations.invite({
        channel: process.env.TARGET_CHANNEL,
        users: event.user
      });

      await client.chat.postMessage({
        channel: event.channel,
        text: `You've been added to a special channel!`
      });

      console.log(`Added ${event.user} to target channel`);
    } catch (error) {
      console.error('❌ Error inviting user:', error.data || error);
    }
  }
});

// ✅ Slash command: /sendnow
app.command('/sendnow', async ({ ack, body, respond }) => {
  await ack();

  if (body.user_id !== process.env.OWNER_USER_ID) {
    return respond({
      text: 'You are not authorized to use this command.',
      response_type: 'ephemeral'
    });
  }

  await sendScheduledMessage(true);

  respond({
    text: 'Extra message has been sent.',
    response_type: 'ephemeral'
  });
});

// ✅ Reaction listener
app.event('reaction_added', async ({ event, client, logger }) => {
  const { user, item } = event;

  if (item.ts !== lastSentMessageTs) return; // Only react to /sendnow message

  try {
    await client.conversations.invite({
      channel: process.env.TARGET_CHANNEL,
      users: user
    });

    await client.chat.postMessage({
      channel: process.env.TARGET_CHANNEL,
      text: `👋 Welcome! You reacted and got added! 🎉`
    });

    console.log("✅ Invited and welcomed user");
  } catch (error) {
    if (error.data?.error === 'already_in_channel') {
      console.log("ℹ️ User is already in the channel.");
    } else {
      logger.error('❌ Reaction error:', error);
    }
  }
});
