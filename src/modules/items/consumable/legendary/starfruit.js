export default {
  id: 4,
  name: "starfruit",
  description: "A legendary starfruit. Has a 50/50 chance to apply a cooldown boost or debuff.",
  rarity: "legendary",
  icon: "⭐",
  type: "consumable",
  value: 6500,
  sellvalue: 2345,
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
  dependencies: "giveCooldownBoost formatTime commandEmbed message",
  async execute(user, item, dep, count = 1) {
    const success = Math.random() < 0.5;
    const multiplier = success ? 15 : 0.33;
    const duration = success ? (3.5 * 60 * 1000) * count : (10 * 60 * 1000) * count;
    const result = await dep.giveCooldownBoost(user, multiplier, duration);
    return await dep.commandEmbed({
      title: `You consumed ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description: success
        ? `🌟 You are **supercharged!** Cooldown speed boosted by **x${multiplier}** for **${dep.formatTime(result.expiresAt - Date.now())}**.`
        : `You are **cursed.** Cooldown slowed to **x${multiplier}** for **${dep.formatTime(result.expiresAt - Date.now())}**.`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};
