export default {
  id: 21,
  name: "adamantite ingot",
  description: "A refined ingot of nearly unbreakable adamantite.",
  rarity: "epic",
  icon: "",
  type: "material",
  value: 9500,
  sellvalue: 2375,
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
      { name: "adamantite ore", count: { min: 1, max: 3 }, chance: 1 }
    ];
  },
  async execute(user, item, dep, count = 1) {},
  _emptyAllowed: ['dependencies', 'execute', 'disassemble'],
};
