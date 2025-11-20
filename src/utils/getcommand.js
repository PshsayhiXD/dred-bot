export const getCommandById = (bot, id) => {
  return bot?.commands
    ? [...bot.commands.values()].find(cmd => cmd.id === id) || null
    : null;
};
// Example:
// getCommandById(bot, 1)   -> { name: 'balance', id: 1, ... }
// getCommandById(bot, 99)  -> null (not found)

export const getCommandByName = (bot, name) => {
  return bot?.commands?.get(name.toLowerCase()) || null;
};
// Example:
// getCommandByName(bot, 'balance')  -> { name: 'balance', id: 1, ... }
// getCommandByName(bot, 'notfound') -> null (command not found)

export const getCommandByCategory = (bot, category) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd =>
        cmd.category && cmd.category.toLowerCase() === category.toLowerCase()
      )
      .map(cmd => [cmd.id, cmd.name])
  );
};
// Example:
// getCommandByCategory(bot, 'Economy') -> { 
//   1: 'balance', 
//   2: 'daily' 
// }
// getCommandByCategory(bot, 'Invaild') -> {}

export const getAllCommandId = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name)
      .map(cmd => [cmd.id, cmd.name])
  );
};
// Example:
// getAllCommandId(bot) -> { 
//   1: 'balance', 
//   2: 'daily', 
//   3: 'ping' 
// }
// getAllCommandId({})  -> {}

export const getAllCommand = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name)
      .map(cmd => [cmd.id, cmd.name])
  );
};
// Example:
// getAllCommandId(bot) -> { 
//   1: 'balance', 
//   2: 'daily', 
//   3: 'ping' 
// }
// getAllCommandId({})  -> {}

export const getAllCommandCooldown = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name && cmd?.cooldown != null)
      .map(cmd => [cmd.id, [cmd.name, cmd.cooldown]])
  );
};
// Example:
// getAllCommandCooldown(bot) -> { 
//   1: ['balance', 5], 
//   2: ['daily', 10], 
//   3: ['ping', 3] 
// }
// getAllCommandCooldown({}) -> {}

export const getAllCommandUsage = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name && cmd?.usage != null)
      .map(cmd => [cmd.id, [cmd.name, cmd.usage]])
  );
};
// Example:
// getAllCommandUsage(bot) -> { 
//   1: ['balance', '<user> [amount]'], 
//   2: ['ban', '[reason]'],
// }
// getAllCommandUsage({}) -> {}

export const getAllCommandPerm = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name && cmd?.perm != null)
      .map(cmd => [cmd.id, [cmd.name, cmd.perm]])
  );
};
// Example:
// getAllCommandPerm(bot) -> { 
//   1: ['balance', 0], 
//   2: ['kick', 2], 
//   3: ['ban', 4] 
// }
// getAllCommandPerm({}) -> {}

export const getAllCommandAliases = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name && Array.isArray(cmd.aliases))
      .map(cmd => [cmd.id, [cmd.name, cmd.aliases]])
  );
};
// Example:
// getAllCommandAliases(bot) -> { 
//   1: ['balance', ['bal', 'b']], 
//   2: ['ban', ['banuser']] 
// }
// getAllCommandAliases({}) -> {}

export const getAllCommandDescription = (bot) => {
  if (!bot.commands) return {};
  return Object.fromEntries(
    [...bot.commands.values()]
      .filter(cmd => cmd?.id != null && cmd?.name && cmd?.description)
      .map(cmd => [cmd.id, [cmd.name, cmd.description]])
  );
};

// Example:
// getAllCommandDescription(bot) -> {
//   1: ['balance', 'Check your balance'],
//   2: ['ban', 'Ban a user'],
//   3: ['kick', 'Kick a user']
// }
// getAllCommandDescription({}) -> {}

export const getDupeIdCommands = (bot) => {
  if (!bot?.commands) return [];
  const idMap = new Map();
  const dupes = [];
  for (const cmd of bot.commands.values()) {
    if (!cmd?.id) continue;
    const existing = idMap.get(cmd.id);
    if (existing) {
      if (!dupes.includes(existing)) dupes.push(existing);
      dupes.push(cmd);
    } else idMap.set(cmd.id, cmd);
  }
  return dupes;
};
// Example:
// getDupeIdCommands(bot) -> [{ id: 1, name: 'balance' }, { id: 1, name: 'bal' }]

export const getDupeNameCommands = (bot) => {
  if (!bot?.commands) return [];
  const nameMap = new Map();
  const dupes = [];
  for (const cmd of bot.commands.values()) {
    if (!cmd?.name) continue;
    const lower = cmd.name.toLowerCase();
    const existing = nameMap.get(lower);
    if (existing) {
      if (!dupes.includes(existing)) dupes.push(existing);
      dupes.push(cmd);
    } else nameMap.set(lower, cmd);
  }
  return dupes;
};
// Example:
// getDupeNameCommands(bot) -> [{ name: 'balance', id: 1 }, { name: 'Balance', id: 3 }]

export const getDupeAliasCommands = (bot) => {
  if (!bot?.commands) return [];
  const aliasMap = new Map();
  const dupes = [];
  for (const cmd of bot.commands.values()) {
    if (!cmd?.aliases || !Array.isArray(cmd.aliases)) continue;
    for (const alias of cmd.aliases.map(a => a.toLowerCase())) {
      const existing = aliasMap.get(alias);
      if (existing) {
        let group = dupes.find(d => d.alias === alias);
        if (!group) {
          group = { alias, commands: [existing] };
          dupes.push(group);
        }
        group.commands.push(cmd);
      } else aliasMap.set(alias, cmd);
    }
  }
  return dupes;
};
// Example:
// [
//   {
//     alias: 'bal',
//     commands: [
//       { name: 'balance', id: 1 },
//       { name: 'money', id: 7 }
//     ]
//   }
// ]
