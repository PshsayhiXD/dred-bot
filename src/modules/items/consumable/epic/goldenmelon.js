export default {
  id: 2,
  name: "goldenmelon",
  description: "A shimmering melon that boosts your passive income by x3.5 for 5 minutes.",
  rarity: "epic",
  icon: "🍈",
  type: "consumable",
  value: 900,
  sellvalue: 300,
  obtainable: true,
  enchantable: true,
  maxEnchantSlot: 1,
  maxEnchantCount: 3,
  sellable: true,
  stackable: true,
  maxstack: Number.MAX_SAFE_INTEGER,
  tradeable: true,
  consumable: true,
  disassemblable: false,
  disassemble() {},
  dependencies: "givePassiveIncomeBoost formatTime commandEmbed message",
  async execute(user, item, dep, count = 1) {
    const multiplier = 3.5;
    const duration = 5 * 60 * 1000 * count;
    await dep.givePassiveIncomeBoost(user, multiplier, duration);
    return await dep.commandEmbed({
      title: `You consumed ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description: `Your passive income is boosted by **x${multiplier}** for **${dep.formatTime(duration)}**.`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};
