export default {
  name: "Risk buffer",
  rarity: "epic",
  description: "Reduces loss when gamble fails.",
  category: "economy",
  obtainable: true,
  maxLevel: 6,
  id: 8,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.1; // 10%
    const perLevel = 0.05; // 5% per level
    const level = skill.level || 1;
    const reduction = base + perLevel * (level - 1);
    return {
      gambleLossReduction: Math.min(reduction, 0.35), // max 35%
    };
  },
  _emptyAllowed: ['dependencies'],
};
