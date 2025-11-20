export default {
  name: "Duplicator",
  rarity: "epic",
  description: "Chance to duplicate all loot gained.",
  category: "loot",
  obtainable: true,
  maxLevel: 7,
  id: 2,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.02; // 2%
    const perLevel = 0.04; // 4%
    const chance = base + perLevel * ((skill.level || 1) - 1);
    return {
      lootDuplicateChance: Math.min(chance, 0.3), // Max 30%
    };
  },
  _emptyAllowed: ['dependencies'],
};
