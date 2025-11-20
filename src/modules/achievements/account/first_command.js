export default {
  name: 'first_command',
  id: 4,
  description: 'Execute your first command',
  obtainable: true,
  category: 'account',
  require: [],
  dependencies: ``,
  need: (user, dep) => {
    return user.command_executed;
  },
  execute: async (user, achievement, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"],
}