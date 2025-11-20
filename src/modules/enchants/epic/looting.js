export default () => ({
  id: 1,
  name: "Looting I",
  description: "Increases mob drop chance by 5%.",
  rarity: "rare",
  obtainable: true,
  category: "loot",
  maxLevel: 3,
  dependencies: ``,
  applyBoost: async (user, enchant, dep) => {},
  _emptyAllowed: ['dependencies'],
});