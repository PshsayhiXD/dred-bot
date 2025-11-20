export default {
  name: "Greed",
  rarity: "rare",
  description: "Increases Dredcoin drops.",
  category: "economy",
  obtainable: true,
  maxLevel: 10,
  id: 4,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 1; // 100%
    const perLevel = 0.05; // 5% per level
    const level = skill.level || 1;
    const multiplier = base + perLevel * level;
    return {
      dredcoinBonus: multiplier, // Max 50%
    };
  },
  _emptyAllowed: ['dependencies'],
};