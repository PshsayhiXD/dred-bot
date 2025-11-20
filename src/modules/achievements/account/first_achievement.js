export default {
  name: 'first_achievement',
  id: 2,
  description: 'Get your first achievement',
  obtainable: true,
  category: 'account',
  require: [],
  dependencies: ``,
  need: (user, dep) => { 
    return user?.achievements?.length === 0 || !user?.achievements?.first_step;
  },
  execute: async (user, achievements, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"],
}