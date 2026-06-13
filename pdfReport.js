const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function ensureReportsDir() {
  const dir = path.join(__dirname, "reports");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function createPdfReport(plate, rows) {
  const ym = getCurrentYearMonth();
  const dir = ensureReportsDir();
  const filePath = path.join(dir, `${plate}_${ym}.pdf`);

  const fontPath = path.join(__dirname, "fonts", "NotoSansTC-Regular.ttf");

  if (!fs.existsSync(fontPath)) {
    throw new Error("找不到中文字型：fonts/NotoSansTC-Regular.ttf");
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: "A4"
    });

    const stream = fs.createWriteStream(filePath);

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
    doc.on("error", reject);

    doc.pipe(stream);

    doc.registerFont("NotoTC", fontPath);
    doc.font("NotoTC");

    doc.fontSize(18).text(`${plate} ${ym} 帳單`, {
      align: "center"
    });

    doc.moveDown();

    let total = 0;

    doc.fontSize(11);
    doc.text("日期 | 群 | 單號 | 車牌 | 車資 | 項目 | 金額 | 車隊");
    doc.moveDown(0.5);

    for (const row of rows) {
      const date = row[0] || "";
      const group = row[1] || "";
      const orderCode = row[2] || "";
      const rowPlate = row[3] || "";
      const fare = row[4] || "0";
      const item = row[5] || "";
      const amount = Number(row[6] || 0);
      const fleet = row[7] || "";

      if (item === "回扣" || item === "百回") {
        total += amount;
      }

      doc.text(
        `${date} | ${group} | ${orderCode} | ${rowPlate} | ${fare} | ${item} | ${amount} | ${fleet}`
      );
    }

    const monthlyFee = 2000;
    const finalTotal = total + monthlyFee;

    doc.moveDown();
    doc.fontSize(13).text(`回扣：${total}`);
    doc.text(`月費：${monthlyFee}`);
    doc.text(`總計：${finalTotal}`);
    doc.moveDown();
    doc.text("158街口：903626458");

    doc.end();
  });
}

module.exports = {
  createPdfReport
};