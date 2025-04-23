const express = require('express');
const axios = require('axios');
const { App } = require('@slack/bolt');

const app = express();
app.use(express.json());

// Bot tokens and signing secret
const bot1 = new App({ token: process.env.BOT1_TOKEN, signingSecret: process.env.SIGNING_SECRET });
const bot2 = new App({ token: process.env.BOT2_TOKEN, signingSecret: process.env.SIGNING_SECRET });

let isActive = false;
let threadTs = null;
let currentTurn = 'BOT2'; // Alternates between BOT1 and BOT2
const OWNER_ID = 'YOUR_SLACK_USER_ID'; // <-- Change this

async function callAI(message) {
    const res = await axios.post("https://ai.hackclub.com/chat/completions", {
        messages: [{ role: "user", content: message }]
    }, { headers: { "Content-Type": "application/json" } });

    return res.data.choices?.[0]?.message?.content || "Hmm...";
}

async function continueConversation(text, bot, channel, thread_ts) {
    const response = await callAI(text);
    await bot.client.chat.postMessage({
        channel,
        thread_ts,
        text: response
    });

    // Switch turn
    currentTurn = currentTurn === 'BOT1' ? 'BOT2' : 'BOT1';
}

bot1.event('message', async ({ event, client }) => {
    if (event.user !== OWNER_ID || event.bot_id) return;

    if (event.text === 'I love AI convos') {
        isActive = true;
        threadTs = null;

        const res = await client.chat.postMessage({
            channel: event.channel,
            text: "Really, I like it too."
        });

        threadTs = res.ts;

        // BOT1 starts the convo in thread
        await client.chat.postMessage({
            channel: event.channel,
            thread_ts: threadTs,
            text: "Hello"
        });

        currentTurn = 'BOT2'; // BOT2 will reply next
    }

    if (event.text === 'STOP IT') {
        isActive = false;
        threadTs = null;
    }
});

bot1.event('message', async ({ event }) => {
    if (!isActive || event.thread_ts !== threadTs || event.bot_id !== process.env.BOT1_ID) return;
    if (currentTurn !== 'BOT2') return;

    const text = event.text;
    setTimeout(() => continueConversation(text, bot2, event.channel, threadTs), 1000);
});

bot2.event('message', async ({ event }) => {
    if (!isActive || event.thread_ts !== threadTs || event.bot_id !== process.env.BOT2_ID) return;
    if (currentTurn !== 'BOT1') return;

    const text = event.text;
    setTimeout(() => continueConversation(text, bot1, event.channel, threadTs), 1000);
});

// Start both bots
(async () => {
    await bot1.start(process.env.PORT1 || 3001);
    await bot2.start(process.env.PORT2 || 3002);
    console.log('Bots are running');
})();
