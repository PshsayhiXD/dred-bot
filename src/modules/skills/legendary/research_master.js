export default {
  name: "Research_Master",
  rarity: "legendary",
  description: "Massively increases research speed and reduces research cost.",
  category: "research",
  obtainable: true,
  maxLevel: 7,
  id: 7,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const baseSpeed = 0.15; // 15%
    const baseCost = 0.1; // 10%
    const perLevelSpeed = 0.08; // 8% per level
    const perLevelCost = 0.05; // 5% per level
    const level = skill.level || 1;
    const speed = baseSpeed + perLevelSpeed * (level - 1);
    const cost = baseCost + perLevelCost * (level - 1);
    return {
      researchSpeedMultiplier: Math.min(speed, 0.75), // max 75%
      researchCostReduction: Math.min(cost, 0.4), // max 40%
    };
  },
  _emptyAllowed: ['dependencies'],
};