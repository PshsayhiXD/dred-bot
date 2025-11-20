export default {
  name: "Xp Amplifier",
  rarity: "common",
  description: "Increases experience gained from all sources.",
  category: "exp",
  obtainable: true,
  maxLevel: 10,
  id: 10,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.05; // 5%
    const perLevel = 0.01; // 1% per level
    const level = skill.level || 1;
    const bonus = base + perLevel * (level - 1);
    return {
      expGainMultiplier: Math.min(bonus, 0.15), // max 15%
    };
  },
  _emptyAllowed: ['dependencies'],
};
