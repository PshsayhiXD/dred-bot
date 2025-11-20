export default {
  name: 'use_a_item',
  id: 1,
  icon: "❔",
  description: 'Use a item in your inventory.',
  rarity: 'common',
  obtainable: true,
  questType: ['daily'],
  require: [],
  dependencies: `formatDate`,
  need: (user, dep) => {
    const today = dep.helper.formatDate(new Date());
    return user.stat.lastItemUsed === today;
  },
  execute: async (user, achievement, dep) => {},
  _emptyAllowed: ['dependencies', 'require', 'questType', 'execute', 'icon'],
}