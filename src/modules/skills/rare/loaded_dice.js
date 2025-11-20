export default {
  name: "Loaded dice",
  rarity: "rare",
  description: "Slightly increases chance to win gambling.",
  category: "economy",
  obtainable: true,
  maxLevel: 5,
  id: 5,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.02; // 2%
    const perLevel = 0.02; // 2% per level
    const level = skill.level || 1;
    const bonus = base + perLevel * (level - 1);
    return {
      gambleWinChanceBonus: Math.min(bonus, 0.1), // max 10%
    };
  },
  _emptyAllowed: ['dependencies'],
};
