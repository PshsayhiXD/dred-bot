export default {
  id: 27,
  name: "candy corn",
  description: "A tiny piece of Halloween sweetness. Gives a small temporary boost.",
  rarity: "common",
  icon: "🍬",
  type: "consumable",
  value: 150,
  sellvalue: 50,
  obtainable: true,
  enchantable: false,
  maxEnchantSlot: 0,
  maxEnchantCount: 0,
  sellable: true,
  stackable: true,
  maxstack: Number.MAX_SAFE_INTEGER,
  tradeable: true,
  consumable: true,
  disassemblable: false,
  disassemble() {},
  dependencies: "giveBoost commandEmbed formatTime message",
  async execute(user, item, dep, count = 1) {
    const dur = 2 * 60 * 1000 * count;
    const eff = [
      { type: "exp", multiplier: 1.1, label: "Small Sugar Rush" },
      { type: "dredcoin", multiplier: 1.1, label: "Minor Coin Boost" }
    ];
    for (const e of eff) await dep.giveBoost(user, e.type, e.multiplier, dur);
    return await dep.commandEmbed({
      title: `You munched ${count}x ${item.name}${count > 1 ? "s" : ""} ${item.icon}`,
      description: eff.map(e => `• ${e.label} x${e.multiplier}`).join("\n") + `\nFor **${dep.formatTime(dur)}**`,
      color: "#FFD700",
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ["dependencies", "execute", "disassemble"],
};