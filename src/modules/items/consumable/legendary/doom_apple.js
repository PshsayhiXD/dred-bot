export default {
  id: 5,
  name: "doom_apple",
  description: "A cursed apple... Up to 50% chance to reset all cooldowns, or double them..",
  rarity: "legendary",
  icon: "🍏",
  type: "consumable",
  value: 13500,
  sellvalue: 5555,
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
  dependencies: `commandEmbed message resetAllCooldowns 
                 doubleAllCooldowns refundItem`,
  async execute(user, item, dep, count = 1) {
    const maxChance = 0.5;
    const chancePerApple = 0.01; 

    const totalChance = Math.min(count * chancePerApple, maxChance);
    const usedCount = Math.floor(maxChance / chancePerApple);
    const refundCount = count > usedCount ? count - usedCount : 0;
    const success = Math.random() < totalChance;
    if (success) await dep.resetAllCooldowns(user);
    else await dep.doubleAllCooldowns(user);
    if (refundCount > 0) await dep.refundItem(user, `${item.type}.${item.name}`, refundCount);
    return await dep.commandEmbed({
      title: `You consumed ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description: `${success
        ? `🍀 The curse favored you **All your cooldowns have been reset.**`
        : `Unlucky... **All your cooldowns are now doubled.**`
      }${refundCount > 0
        ? `\nYou were refunded **${refundCount}x ${item.name}** ${item.icon}.`
        : ''
      }`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};