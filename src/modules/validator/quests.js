export default {
  id: 1,
  name: 'Unnamed Quest',
  icon: '❔',
  description: '',
  rarity: 'common',
  obtainable: false,
  questType: [],
  require: [],
  dependencies: ``,
  need: (user, dep) => {},
  execute: (user, quest, dep) => {},
  _emptyAllowed: ['dependencies', 'require', 'questType', 'execute', 'icon'],
};
