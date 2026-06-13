const { google } = require("googleapis");

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

let credentials = null;

if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  console.log("Google service account:", credentials.client_email);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function getSpreadsheetInfo() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID
  });
  return res.data;
}

async function ensureSheetExists(sheetName) {
  const sheets = await getSheets();
  const info = await getSpreadsheetInfo();

  const exists = info.sheets.some(s => s.properties.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName }
            }
          }
        ]
      }
    });
  }

  await ensureHeader(sheetName);
}

async function ensureHeader(sheetName) {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1:G1`
  });

  const values = res.data.values || [];

  if (values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1:G1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          "日期",
          "群",
          "單號",
          "車資",
          "項目",
          "金額",
          "車隊"
        ]]
      }
    });
  }
}

async function appendAccountingRecord(record) {
  const sheetName = record.plate;

  await ensureSheetExists(sheetName);

  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:G`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        record.date,
        record.group,
        record.orderCode,
        record.fare,
        record.item,
        record.amount,
        record.fleet
      ]]
    }
  });
}

module.exports = {
  appendAccountingRecord
};