export default {
  id: 7,
  name: "chocolate bar",
  description: "Sweet and energizing. Boosts your luck for 10 minutes.",
  rarity: "rare",
  icon: "🍫",
  type: "consumable",
  value: 9900,
  sellvalue: 4444,
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
  dependencies: "giveLuck commandEmbed formatTime message",
  async execute(user, item, dep, count = 1) {
    const multiplier = 1.5;
    const duration = 10 * 60 * 1000 * count;
    await dep.giveLuck(user, "general", multiplier, duration);
    return await dep.commandEmbed({
      title: `You ate ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description: `You feel lucky! **Luck increased by x${multiplier}** for **${dep.formatTime(duration)}**.`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};