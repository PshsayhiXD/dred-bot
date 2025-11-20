export default {
  id: 3,
  name: "kiwi",
  description: "A mythical kiwi. Permanently increases dredcoin and EXP multipliers by 0.5%.",
  rarity: "mythical",
  icon: "🥝",
  type: "consumable",
  value: 199000,
  sellvalue: 88888,
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
  dependencies: "commandEmbed message givePermanentBoost",
  async execute(user, item, dep, count = 1) {
    const increment = 0.005 * count;
    await dep.givePermanentBoost(user, {
      dredcoin: increment,
      exp: increment,
    });
    return await dep.commandEmbed({
      title: `You consumed ${count}x ${item.name}${count > 1 ? 's' : ''} ${item.icon}`,
      description: `Your permanent **dredcoin** and **EXP** multipliers increased by **${(increment * 100).toFixed(2)}%**.`,
      color: '#00FF00',
      user,
      reward: false,
      message: dep.message,
    });
  },
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};
