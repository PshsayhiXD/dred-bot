export default {
  name: 'trillionaire',
  id: 7,
  description: 'Reach total of 1.000.000.000.000 dredcoin in your balance',
  obtainable: true,
  category: 'economy',
  require: [],
  dependencies: ``,
  need: (user) => {
    return user.balance.dredcoin >= 100000000000;
  },
  execute: async (user, achievement, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"],
}