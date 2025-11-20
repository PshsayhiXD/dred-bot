export default {
  id: 20,
  name: "mithril ingot",
  description: "A refined ingot forged from mithril ore.",
  rarity: "epic",
  icon: "",
  type: "material",
  value: 9000,
  sellvalue: 2250,
  obtainable: false,
  enchantable: false,
  maxEnchantSlot: 2,
  maxEnchantCount: 2,
  sellable: true,
  stackable: true,
  maxstack: Number.MAX_SAFE_INTEGER,
  tradeable: false,
  consumable: false,
  disassemblable: true,
  dependencies: ``,
  disassemble(user, item, dep) {
    return [
      { name: "mithril ore", count: { min: 1, max: 3 }, chance: 1 }
    ];
  },
  async execute(user, item, dep, count = 1) {},
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};