export default {
  name: "Consumable Preservation",
  rarity: "rare",
  description: "Chance to preserve consumables when used.",
  category: "consumable",
  obtainable: true,
  maxLevel: 10,
  id: 1,
  dependencies: ``,
  applyBoost(user, skill, dep) {
    const base = 0.1; // 10%
    const perLevel = 0.02; // 2%
    const chance = base + perLevel * ((skill.level || 1) - 1);
    return {
      consumablePreserveChance: Math.min(chance, 0.5), // Max 50%
    };
  },
  _emptyAllowed: ['dependencies'],
};
