export default {
  name: 'first_step',
  id: 1,
  description: 'Create a new account.',
  obtainable: true,
  category: 'account',
  require: [],
  dependencies: ``,
  need: (user, dep) => {
    return user?.account;
  },
  execute: async (user, achievement, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"],
}