export default {
  name: "High_Roller",
  rarity: "epic",
  description: "Slightly increases your winnings from gambles.",
  category: "economy",
  obtainable: true,
  maxLevel: 5,
  id: 11,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const level = skill.level || 1;
    const bonus = 0.03 + level * 0.015; // 3% to 9%
    return {
      gambleWinProfitBonus: Math.min(bonus, 0.09), // max 9%
    };
  },
  _emptyAllowed: ['dependencies'],
};
