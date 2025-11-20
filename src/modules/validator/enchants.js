export default () => ({
  id: 1,
  name: 'Unnamed Enchant',
  description: '',
  rarity: 'common',
  obtainable: false,
  category: 'general',
  maxLevel: 1,
  dependencies: ``,
  applyBoost: async (user, enchant, dep) => {},
  _emptyAllowed: ['dependencies'],
});
