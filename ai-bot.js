require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

let isActive = false;
let threadTs = null;
let currentTurn = 'AI1';
const OWNER_ID = 'U083T3ZP6AV';

const AI1_USERNAME = 'BeansAI';
const AI1_ICON_URL = 'https://files.catbox.moe/vim76w.png';

const AI2_USERNAME = 'BreadAI';
const AI2_ICON_URL = 'https://files.catbox.moe/8l6qb6.png';

async function callAI(message) {
  const res = await axios.post("https://ai.hackclub.com/chat/completions/", {
    messages: [{ role: "user", content: message }]
  }, { headers: { "Content-Type": "application/json" } });

  return res.data.choices?.[0]?.message?.content || "hmm...";
}

async function continueConversation(text, channel, thread_ts) {
  const response = await callAI(text);

  await slackApp.client.chat.postMessage({
    channel,
    thread_ts,
    text: response,
    username: currentTurn === 'AI1' ? AI1_USERNAME : AI2_USERNAME,
    icon_url: currentTurn === 'AI1' ? AI1_ICON_URL : AI2_ICON_URL
  });

  currentTurn = currentTurn === 'AI1' ? 'AI2' : 'AI1';

  if (isActive) {
    setTimeout(() => continueConversation(response, channel, thread_ts), 1000);
  }
}

// Single message event handler
slackApp.event('message', async ({ event, client }) => {
  if (event.user === OWNER_ID && !event.bot_id) {
    // Start conversation trigger
    if (event.text === 'i like ai') {
      isActive = true;
      currentTurn = 'AI1';

      const res = await client.chat.postMessage({
        channel: event.channel,
        text: "really, i like it too.",
        username: AI1_USERNAME,
        icon_url: AI1_ICON_URL
      });

      threadTs = res.ts;
      await continueConversation("hello", event.channel, threadTs);
    }

    // Stop conversation trigger
    if (event.text === 'STOP') {
      isActive = false;
      threadTs = null;
    }
  }
});

// Start the app
(async () => {
  const PORT = 3000;
  await slackApp.start(PORT);
  console.log(`Server is running on port ${PORT}`);
})();
