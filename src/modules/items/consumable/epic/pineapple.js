export default {
  id: 6,
  name: "pineapple",
  description: "A strange tropical fruit. Grants multiple random boosts (or nerfs).",
  rarity: "epic",
  icon: "🍍",
  type: "consumable",
  value: 1800,
  sellvalue: 600,
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
  dependencies: "giveBoost commandEmbed formatTime message",
  async execute(user, item, dep, count = 1) {
    const baseDuration = 1 * 60 * 1000;
    const duration = baseDuration * count;
    const effects = [
      { type: 'exp', multiplier: 1.5, label: 'EXP Boost' },
      { type: 'exp', multiplier: 0, label: 'No EXP Gain' },
      { type: 'dredcoin', multiplier: 2, label: 'Coin Boost' },
      { type: 'dredcoin', multiplier: 0.1, label: 'Coin Drain' },
      { type: 'cooldown', multiplier: 0.5, label: 'Cooldown Cut' },
      { type: 'cooldown', multiplier: 1.5, label: 'Slower Cooldowns' },
      { type: 'passiveIncome', multiplier: 3, label: 'Passive Income Surge' },
      { type: 'passiveIncome', multiplier: 0.5, label: 'Passive Slowdown' },
    ];
    const chosen = new Set();
    while (chosen.size < 3) chosen.add(Math.floor(Math.random() * effects.length));
    const applied = [];
    for (const index of chosen) {
      const effect = effects[index];
      await dep.giveBoost(user, effect.type, effect.multiplier, duration);
      applied.push(`${effect.label} - x${effect.multiplier}`);
    }
    return await dep.commandEmbed({
      title: `You consumed ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description:
        `its... confusing.\n` +
        applied.map(e => `• ${e}`).join('\n') +
        `\nFor **${dep.formatTime(duration)}**`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};