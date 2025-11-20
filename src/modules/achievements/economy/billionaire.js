export default {
  name: 'billionaire',
  id: 6,
  description: 'Reach a total of 1.000.000.000 dredcoin in your balance',
  obtainable: true,
  category: 'economy',
  require: [],
  dependencies: ``,
  need: (user, dep) => {
    return user.balance.dredcoin >= 100000000;
  },
  execute: async (user, achievement, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"],
}