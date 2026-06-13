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

  const isErrand = orderLine.includes("跑腿");
  const isDriver = orderLine.includes("代駕");

  // =========================
  // 跑腿單
  // =========================
  if (
    isErrand &&
    actionLine === "跑腿開始"
  ) {
    return {
      mode: "errand",
      group,
      orderCode,
      plate: plateLine,
      fare: 0,
      item: "回扣",
      amount: 20
    };
  }

  // =========================
  // 一般單
  // =========================
  if (
    !isErrand &&
    !isDriver &&
    (
      actionLine === "上" ||
      actionLine === "客上" ||
      actionLine === "客人上車" ||
      actionLine === "客人直接上車" ||
      actionLine === "⬆️" ||
      actionLine === "⬆" ||
      actionLine === "↑"
    )
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

  // =========================
  // 百回待補
  // =========================
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

  // =========================
  // 百回 / 代駕結算
  // 格式：850/100
  // =========================
  const fareMatch = actionLine.match(/^(\d+)\/(\d+)$/);

  if (fareMatch) {
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