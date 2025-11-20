export default {
  id: 26,
  name: "lollipop",
  description: "A colorful sugar swirl. Sweet, simple, and slightly energizing.",
  rarity: "common",
  icon: "🍭",
  type: "consumable",
  value: 200,
  sellvalue: 60,
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
    const dur = 3 * 60 * 1000 * count;
    await dep.giveBoost(user, "exp", 1.15, dur);
    return await dep.commandEmbed({
      title: `You enjoyed ${count}x ${item.name}${count > 1 ? "s" : ""} ${item.icon}`,
      description: `• Sugar Rush x1.15\nFor **${dep.formatTime(dur)}**`,
      color: "#FF69B4",
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ["dependencies", "execute", "disassemble"],
};
