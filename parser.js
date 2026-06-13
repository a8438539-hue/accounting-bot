function parseAccountingMessage(text) {
  const lines = text
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const orderLine = lines[0];
  const plateLine = lines[1];
  const actionLine = lines[2];

  const groupMatch = orderLine.match(/^#([^\/]+)/);

  const group = groupMatch ? groupMatch[1] : "";
  const orderCode = groupMatch ? `#${group}` : "";

  // 百回
  if (orderLine.includes("百回")) {
    const fareMatch = actionLine.match(/^(\d+)\/(\d+)$/);

    if (!fareMatch) return null;

    return {
      type: "hundred",
      group,
      orderCode,
      plate: plateLine,
      fare: Number(fareMatch[1]),
      item: "百回",
      amount: Number(fareMatch[2])
    };
  }

  // 一般單
  if (
    actionLine === "上" ||
    actionLine === "客上" ||
    actionLine === "客人上車" ||
    actionLine === "客人直接上車"
  ) {
    return {
      type: "normal",
      group,
      orderCode,
      plate: plateLine,
      fare: 0,
      item: "回扣",
      amount: 20
    };
  }

  return null;
}

module.exports = {
  parseAccountingMessage
};