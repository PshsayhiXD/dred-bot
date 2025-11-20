export default {
  name: "Tax Evasion",
  rarity: "epic",
  description: "Heavily reduces all tax rates.",
  category: "economy",
  obtainable: true,
  maxLevel: 10,
  id: 9,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.15; // 15%
    const perLevel = 0.075; // 7.5% per level
    const level = skill.level || 1;
    const reduction = base + perLevel * (level - 1);
    return {
      taxPercentReduction: Math.min(reduction, 0.75), // max 75%
    };
  },
  _emptyAllowed: ['dependencies'],
};
