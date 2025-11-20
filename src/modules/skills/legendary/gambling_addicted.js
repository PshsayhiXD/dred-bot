export default {
  name: "Gambling Addicted",
  rarity: "legendary",
  description: "Winning a gamble has a chance to multiply the win.",
  category: "economy",
  obtainable: true,
  maxLevel: 6,
  id: 3,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const level = skill.level || 1;
    const x2 = 0.1 + level * 0.02; // 10% to 22%
    const x3 = level >= 3 ? 0.02 + (level - 3) * 0.015 : 0; // up to 6%
    const x4 = level >= 6 ? 0.01 : 0; // 1% only at max level
    return {
      gambleX2Chance: Math.min(x2, 0.22), // max 22%
      gambleX3Chance: Math.min(x3, 0.06), // max 6%
      gambleX4Chance: x4, // 1% only at level 6
    };
  },
  _emptyAllowed: ['dependencies'],
};