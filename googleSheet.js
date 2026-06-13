const { google } = require("googleapis");

let SHEET_ID = process.env.GOOGLE_SHEET_ID || "";

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
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]
});

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

let monthlySpreadsheetIdCache = null;

function getCurrentMonthName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `車隊記帳_${year}-${month}`;
}

async function createMonthlySpreadsheet() {
  const sheets = await getSheets();
  const title = getCurrentMonthName();

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title }
    }
  });

  monthlySpreadsheetIdCache = res.data.spreadsheetId;
  SHEET_ID = monthlySpreadsheetIdCache;

  console.log("已建立本月試算表:", title, monthlySpreadsheetIdCache);

  return monthlySpreadsheetIdCache;
}

async function getActiveSpreadsheetId() {
  if (monthlySpreadsheetIdCache) return monthlySpreadsheetIdCache;

  if (SHEET_ID) {
    monthlySpreadsheetIdCache = SHEET_ID;
    return SHEET_ID;
  }

  return await createMonthlySpreadsheet();
}

async function getSpreadsheetInfo() {
  const sheets = await getSheets();
  const spreadsheetId = await getActiveSpreadsheetId();

  const res = await sheets.spreadsheets.get({
    spreadsheetId
  });

  return res.data;
}

async function ensureSheetExists(sheetName) {
  const sheets = await getSheets();
  const spreadsheetId = await getActiveSpreadsheetId();
  const info = await getSpreadsheetInfo();

  const exists = info.sheets.some(s => s.properties.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
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
  await formatSheet(sheetName);
}

async function ensureHeader(sheetName) {
  const sheets = await getSheets();
  const spreadsheetId = await getActiveSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:H1`
  });

  const values = res.data.values || [];

  if (values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:H1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          "日期",
          "群",
          "單號",
          "車牌",
          "車資",
          "項目",
          "金額",
          "車隊"
        ]]
      }
    });
  }
}

async function formatSheet(sheetName) {
  const sheets = await getSheets();
  const spreadsheetId = await getActiveSpreadsheetId();

  const info = await sheets.spreadsheets.get({ spreadsheetId });

  const target = info.data.sheets.find(
    s => s.properties.title === sheetName
  );

  if (!target) return;

  const sheetId = target.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 }
            },
            fields: "gridProperties.frozenRowCount"
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 8
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
                textFormat: {
                  bold: true,
                  fontSize: 11
                },
                borders: {
                  top: { style: "SOLID" },
                  bottom: { style: "SOLID" },
                  left: { style: "SOLID" },
                  right: { style: "SOLID" }
                }
              }
            },
            fields: "userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,borders)"
          }
        },
        ...[
          { col: 0, color: { red: 1, green: 1, blue: 0 } },
          { col: 1, color: { red: 0, green: 1, blue: 1 } },
          { col: 2, color: { red: 0, green: 1, blue: 0 } },
          { col: 3, color: { red: 1, green: 1, blue: 0 } },
          { col: 4, color: { red: 0.25, green: 0.55, blue: 0.9 } },
          { col: 5, color: { red: 1, green: 1, blue: 0 } },
          { col: 6, color: { red: 1, green: 1, blue: 0 } },
          { col: 7, color: { red: 0.25, green: 0.55, blue: 0.9 } }
        ].map(item => ({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: item.col,
              endColumnIndex: item.col + 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: item.color
              }
            },
            fields: "userEnteredFormat.backgroundColor"
          }
        })),
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 8
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
                textFormat: {
                  bold: true,
                  fontSize: 10
                },
                borders: {
                  top: { style: "SOLID" },
                  bottom: { style: "SOLID" },
                  left: { style: "SOLID" },
                  right: { style: "SOLID" }
                }
              }
            },
            fields: "userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,borders)"
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              startColumnIndex: 5,
              endColumnIndex: 6
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  foregroundColor: { red: 1, green: 0.45, blue: 0 }
                }
              }
            },
            fields: "userEnteredFormat.textFormat.foregroundColor"
          }
        },
        ...[
          { start: 0, end: 1, width: 80 },
          { start: 1, end: 2, width: 80 },
          { start: 2, end: 3, width: 420 },
          { start: 3, end: 4, width: 110 },
          { start: 4, end: 5, width: 110 },
          { start: 5, end: 6, width: 110 },
          { start: 6, end: 7, width: 110 },
          { start: 7, end: 8, width: 110 }
        ].map(w => ({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: w.start,
              endIndex: w.end
            },
            properties: {
              pixelSize: w.width
            },
            fields: "pixelSize"
          }
        }))
      ]
    }
  });
}

function getOrderKey(text) {
  return String(text || "")
    .replace(/百回/g, "")
    .replace(/\s+/g, "")
    .trim();
}

async function appendAccountingRecord(record) {
  const sheetName = "總表";

  await ensureSheetExists(sheetName);

  const sheets = await getSheets();
  const spreadsheetId = await getActiveSpreadsheetId();

  const read = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:H`
  });

  const rows = read.data.values || [];

  let targetRow = -1;

  for (let i = 1; i < rows.length; i++) {
    const rowOrderCode = rows[i][2];
    const rowPlate = rows[i][3];

    if (
      getOrderKey(rowOrderCode) === getOrderKey(record.orderCode) &&
      rowPlate === record.plate
    ) {
      targetRow = i + 1;
      break;
    }
  }

  const values = [[
    record.date,
    record.group,
    record.orderCode,
    record.plate,
    record.fare,
    record.item,
    record.amount,
    record.fleet
  ]];

  if (targetRow !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${targetRow}:H${targetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    console.log("更新既有記帳:", record.plate, record.orderCode, record.item);
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:H`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values }
  });

  console.log("新增記帳:", record.plate, record.orderCode, record.item);
}

async function getPlateRows(plate) {
  const sheetName = "總表";

  await ensureSheetExists(sheetName);

  const sheets = await getSheets();
  const spreadsheetId = await getActiveSpreadsheetId();

  const read = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:H`
  });

  const rows = read.data.values || [];

  return rows.slice(1).filter(row => {
    return row[3] === plate;
  });
}

module.exports = {
  appendAccountingRecord,
  getPlateRows
};