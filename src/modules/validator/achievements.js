export default {
  id: 1,
  name: 'Unnamed Achievement',
  description: '',
  obtainable: false,
  category: 'general',
  require: [],
  dependencies: ``,
  need: (user, dep) => {},
  execute: (user, ach, dep) => {},
  _emptyAllowed: ["require", "dependencies", "execute"]
};
