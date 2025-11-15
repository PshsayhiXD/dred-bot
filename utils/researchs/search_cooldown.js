export default {
  name: "Search Cooldown",
  description: "Reduces the cooldown of search by 5% per level.",
  icon: "icon/search_cooldown.png",
  id: 3,
  maxLevel: 5,
  require: ["skill_rerolling"],
  cost: (level) => 1000 * Math.pow(1.2, level - 1), // 1000, 1200, 1440, 1728, 1974
  duration: (level) => 5 * 60 * 1000 * (level + 1), // 5 minutes per level
  dependencies: `loadData saveData`,
  apply: async (user, research, dep) => {
    const cooldownReduction = 0.05 * research.level;
    const data = await dep.loadData(user);
    data.stats.search_cooldown = Math.max(0, 1 - cooldownReduction);
    await dep.saveData(user, data);
    return {
      user,
      cooldownReduction,
    }
  },
  _emptyAllowed: ['dependencies', 'require', 'icon'],
};