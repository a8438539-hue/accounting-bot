function parseAccountingMessage(text) {
  const lines = text
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const orderLine = lines[0];
  const plateLine = lines[1];
  const actionLine = lines[2];

  const groupMatch = orderLine.match(/^#([^\/\s]+)/);

const group = groupMatch ? groupMatch[1] : "";

// 保留完整單號+地址
const orderCode = orderLine;

  if (!orderCode) return null;

  // 1. 一般客上：先記回扣20
  if (
    actionLine === "上" ||
    actionLine === "客上" ||
    actionLine === "客人上車" ||
    actionLine === "客人直接上車"
  ) {
    return {
      mode: "normal",
      group,
      orderCode,
      plate: plateLine,
      fare: 0,
      item: "回扣",
      amount: 20
    };
  }

  // 2. 改百回：先改成待補，不要算20
  if (
    actionLine === "改百回" ||
    actionLine === "百回" ||
    actionLine === "算百回"
  ) {
    return {
      mode: "hundred_pending",
      group,
      orderCode,
      plate: plateLine,
      fare: 0,
      item: "百回待補",
      amount: 0
    };
  }

// 3. 補百回金額：600/80
const fareMatch = actionLine.match(/^(\d+)\/(\d+)$/);
if (fareMatch && orderLine.includes("百回")) {
  return {
    mode: "hundred_final",
    group,
    orderCode,
    plate: plateLine,
    fare: Number(fareMatch[1]),
    item: "百回",
    amount: Number(fareMatch[2])
  };
}

  return null;
}

module.exports = {
  parseAccountingMessage
};