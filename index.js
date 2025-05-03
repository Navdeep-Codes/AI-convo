require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

let lastSentMessageTs = null; 

app.command('/campaign', async ({ ack, body, respond }) => {
  await ack();

  if (body.user_id !== process.env.OWNER_USER_ID) {
    return respond({
      text: '❌ You are not authorized to use this command.',
      response_type: 'ephemeral'
    });
  }

  try {
    const result = await app.client.chat.postMessage({
      channel: process.env.STARTUP_CHANNEL,
      text: `react to this message to join <#${process.env.TARGET_CHANNEL}>!`
    });

    lastSentMessageTs = result.ts;

    console.log("✅ Marketing message sent at:", lastSentMessageTs);

    respond({
      text: '✅ Marketing message has been sent.',
      response_type: 'ephemeral'
    });
  } catch (err) {
    console.error('❌ Error sending message:', err);
    respond({
      text: '❌ Failed to send message.',
      response_type: 'ephemeral'
    });
  }
});

app.event('reaction_added', async ({ event, client, logger, ack }) => {
  // Acknowledge the event immediately
  await ack();

  const { user, item } = event;

  if (item.ts !== lastSentMessageTs) return;

  try {
    await client.conversations.invite({
      channel: process.env.TARGET_CHANNEL,
      users: user
    });

    await client.chat.postMessage({
      channel: process.env.TARGET_CHANNEL,
      text: `👋 Welcome! You reacted and got added! 🎉`
    });

    console.log(`✅ Invited ${user} via reaction`);
  } catch (error) {
    if (error.data?.error === 'already_in_channel') {
      console.log("ℹ️ User already in the channel.");
    } else {
      logger.error('❌ Error inviting user:', error);
    }
  }
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡ Slack bot running on port ${port}`);
})();
