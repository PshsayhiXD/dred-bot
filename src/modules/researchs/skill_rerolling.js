export default {
  name: "Skill Rerolling",
  description: "Unlock the ability to reroll your skills.",
  icon: "icon/skill_rerolling.png",
  id: 2,
  maxLevel: 1,
  require: ["unlock_research"],
  cost: (level) => 750,
  duration: (level) => 5 * 60 * 1000,
  dependencies: `loadData saveData`,
  apply: async (user, research, dep) => {
    let data = await dep.loadData(user);
    if (!data.skills) data.skills = [];
    if (!data.skills.rerollable) data.skills.rerollable = true;
    await dep.saveData(user, data);
    return {
      user,
      rerollable: true,
    };
  },
  _emptyAllowed: ['dependencies', 'require', 'icon'],
};