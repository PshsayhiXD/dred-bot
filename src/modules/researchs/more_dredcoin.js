export default {
  name: "More dredcoin",
  description: "Earn more dredcoin from all sources. 1.1x per level.",
  icon: "",
  id: 5,
  maxLevel: 5,
  require: ["search_cooldown", "search_quality"],
  cost: (level) => 100000 * (level + 1),
  duration: (level) => 5 * 60 * 1000 * (level + 1), // 5 minutes per level
  dependencies: `loadData saveData`,
  apply: async (user, research, dep) => {
    let data = await dep.loadData(user);
    const multiplier = 1 + (research.level * 0.1);
    data.stat.dredcoinEarningMultiplier = (data.stat.dredcoinEarningMultiplier || 1) * multiplier;
    await dep.saveData(user, data);
  },
  _emptyAllowed: ['dependencies', 'require', 'icon'],
};