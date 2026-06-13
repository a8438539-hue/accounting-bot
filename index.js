require("dotenv").config();

const express = require("express");
const line = require("@line/bot-sdk");

const { parseAccountingMessage } = require("./parser");
const { appendAccountingRecord } = require("./googleSheet");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

let sheetQueue = Promise.resolve();

function enqueueSheetJob(job) {
  sheetQueue = sheetQueue
    .then(job)
    .catch(err => {
      console.error("sheet job error:", err);
    });

  return sheetQueue;
}

app.post("/webhook", line.middleware(config), async (req, res) => {
  res.status(200).end();

  const events = req.body.events || [];

  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error("handleEvent error:", err);
    }
  }
});

async function handleEvent(event) {
  if (event.type !== "message") return;
  if (event.message.type !== "text") return;

  const text = event.message.text;

  const parsed = parseAccountingMessage(text);
  if (!parsed) return;

  const today = new Date();
  const dateText = `${today.getMonth() + 1}/${today.getDate()}`;

  await enqueueSheetJob(() =>
  appendAccountingRecord({
    date: dateText,
    group: parsed.group,
    orderCode: parsed.orderCode,
    plate: parsed.plate,
    fare: parsed.fare,
    item: parsed.item,
    amount: parsed.amount,
    fleet: "自家"
  })
);

 console.log("記帳成功:", parsed.plate, parsed.orderCode, parsed.item, parsed.amount);
}

app.get("/", (req, res) => {
  res.send("Accounting Bot is running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Accounting Bot running on port ${PORT}`);
});