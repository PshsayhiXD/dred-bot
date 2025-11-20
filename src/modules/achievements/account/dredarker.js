export default {
  name: 'dredarker',
  id: 3,
  description: 'Connect your account to drednot.io',
  obtainable: false,
  category: 'account',
  require: [],
  dependencies: ``,
  need: (user, dep) => {
    return user.account.drednotName && user.account.linked['drednot.io'];
  },
  execute: async (user, achievement, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"],
}