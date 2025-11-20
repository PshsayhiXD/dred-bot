export default {
  name: "Market_Dealer",
  rarity: "legendary",
  description: "Increases the profit from selling items.",
  category: "economy",
  obtainable: true,
  maxLevel: 10,
  id: 6,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.1; // 10%
    const perLevel = 0.05; // 5% per level
    const level = skill.level || 1;
    const bonus = base + perLevel * (level - 1);
    return {
      saleProfitBonus: Math.min(bonus, 0.55), // max 55%
    };
  },
  _emptyAllowed: ['dependencies'],
};
