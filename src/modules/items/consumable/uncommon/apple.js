export default {
  id: 1,
  name: "apple",
  description: "A juicy apple. Grants x2 cooldown speed for 5 minutes.",
  rarity: "uncommon",
  icon: "🍎",
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
  dependencies: "giveCooldownBoost commandEmbed formatTime message",
  async execute(user, item, dep, count = 1) {
    const multiplier = 2;
    const duration = 5 * 60 * 1000 * count;
    await dep.giveCooldownBoost(user, multiplier, duration);
    return await dep.commandEmbed({
      title: `You consumed ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description: `You received a **x${multiplier} cooldown boost** for **${dep.formatTime(duration)}**.`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};
