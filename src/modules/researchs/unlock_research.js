export default {
  name: "Unlock Research",
  description: "Unlock access to the research tree.",
  icon: "icon/unlock_research.png",
  id: 1,
  maxLevel: 1,
  require: [],
  cost: (level) => 100,
  duration: (level) => 5 * 60 * 1000, 
  dependencies: `loadData saveData`,
  apply: async (user, research, dep) => {
    let data = dep.loadData(user);
    if (!data.research) data.research = {};
    data.research.unlock = true;
    await dep.saveData(user, data);
    return {
      user,
      unlock: true,
    };
  },
  _emptyAllowed: ['dependencies', 'require', 'icon'],
};