const customTypes = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  url: v => /^https?:\/\/\S+$/.test(v),
  int: v => /^-?\d+$/.test(v),
  float: v => !isNaN(parseFloat(v)),
  mention: v => /^<@!?\d+>$/.test(v),
};
export function checkMissingArgs(commandIdOrName, bot, { args = [], attachments = [] } = {}) {
  const commands = bot.commands;
  let command;
  if (typeof commandIdOrName === 'number') command = Array.from(commands.values()).find(cmd => cmd.id === commandIdOrName);
  else if (typeof commandIdOrName === 'string') command = commands.get(commandIdOrName.toLowerCase());
  if (!command) return '❌ Command not found.';
  const usage = command.usage || '';
  const parts = usage.match(/<[^>]+>|\[[^\]]+\]/g) || [];
  const displayParts = [command.name];
  const arrows = [];
  const missing = [];
  for (let i = 0, argIndex = 0; i < parts.length; i++) {
    const part = parts[i];
    const isRequired = part.startsWith('<');
    let arg = args[argIndex];
    const attachment = attachments[argIndex];
    const attachmentMatch = part.match(/^<attachment(?::(\w+))?>$/);
    if (attachmentMatch) {
      const expectedType = attachmentMatch[1] || 'any';
      if (isRequired && !attachment) {
        missing.push(part);
        displayParts.push(part);
        arrows.push(' '.repeat(displayParts.join(' ').length + 1) + '^'.repeat(part.length));
        continue;
      }
      if (attachment) {
        if (expectedType !== 'any') {
          const isImage = attachment.contentType?.startsWith('image/');
          if (expectedType === 'image' && !isImage) {
            missing.push(part);
            displayParts.push(part);
            arrows.push(' '.repeat(displayParts.join(' ').length + 1) + '^'.repeat(part.length));
            continue;
          }
        }
        displayParts.push(`\`${attachment.name}\``);
        continue;
      }
    }
    const match1 = part.match(/^<(.+)>$/);
    let validOptions = null;
    let expectedTypes = [];
    let regexType = null;
    let range = null;
    let length = null;
    let defVal = null;
    let isArray = false;
    if (match1) {
      const content = match1[1];
      // Default value
      const [main, def] = content.split('=');
      if (def) defVal = def;
      // Array type
      if (main.endsWith('[]')) isArray = true;
      // Union types: <id:number|string>
      const typeSplit = main.replace('[]', '').split(':');
      const name = typeSplit[0];
      if (typeSplit[1]) {
        expectedTypes = typeSplit[1].split('|').map(t => t.toLowerCase());
        // Regex type
        if (expectedTypes.length === 1 && expectedTypes[0].startsWith('/') && expectedTypes[0].endsWith('/')) {
          try {
            regexType = new RegExp(expectedTypes[0].slice(1, -1));
          } catch {}
          expectedTypes = [];
        }
        // Range/length: <number[0-10]>, <string[3-12]>
        const constraintMatch = typeSplit[1].match(/(\w+)\[(\d+)(?:-(\d+))?\]/);
        if (constraintMatch) {
          const [, t, min, max] = constraintMatch;
          expectedTypes = [t.toLowerCase()];
          if (t.toLowerCase() === 'number') {
            if (max) range = [Number(min), Number(max)];
            else range = [Number(min), Number(min)];
          }
          if (t.toLowerCase() === 'string') {
            if (max) length = [Number(min), Number(max)];
            else length = [Number(min), Number(min)];
          }
        }
      }
      // Options: <red|green|blue>
      const splitOpts = name.includes('|') ? name.split('|') : [];
      if (splitOpts.length > 1) validOptions = splitOpts.map(opt => opt.toLowerCase());
    }
    let argDisplay = '';
    let isInvalid = false;
    if (!arg && defVal) arg = defVal;
    if (isArray && arg) arg = arg.split(',');
    const validate = v => {
      if (validOptions && !validOptions.includes(v.toLowerCase())) return false;
      if (regexType && !regexType.test(v)) return false;
      for (const t of expectedTypes) {
        if (t === 'string') {
          if (length && (v.length < length[0] || v.length > length[1])) return false;
        } else if (t === 'number') {
          if (isNaN(Number(v))) return false;
          if (range && (Number(v) < range[0] || Number(v) > range[1])) return false;
        } else if (t === 'boolean') {
          if (!['true', 'false'].includes(v.toLowerCase())) return false;
        } else if (customTypes[t] && !customTypes[t](v)) {
          return false;
        }
      }
      return true;
    };
    if (isRequired && !arg) {
      argDisplay = part;
      isInvalid = true;
      missing.push(part);
    } else if (arg) {
      if (isArray) {
        const bad = arg.find(v => !validate(v));
        if (bad) {
          argDisplay = part;
          isInvalid = true;
          missing.push(part);
        } else argDisplay = `\`[${arg.join(', ')}]\``;
      } else {
        if (!validate(arg)) {
          argDisplay = part;
          isInvalid = true;
          missing.push(part);
        } else argDisplay = `\`${arg}\``;
      }
    } else argDisplay = part;
    const currentLine = displayParts.join(' ');
    const startPos = currentLine.length + 1;
    if (isInvalid) arrows.push(' '.repeat(startPos) + '^'.repeat(argDisplay.length));
    displayParts.push(argDisplay);
    argIndex++;
  }
  if (missing.length > 0) {
    const usageLine = displayParts.join(' ');
    const arrowLine = arrows.length ? '\n' + arrows.join('\n') : '';
    return `❌ **Missing or invalid argument(s)**: ${missing.join(', ')}\n\`\`\`\n${usageLine}${arrowLine}\n\`\`\``;
  }
  return null;
}

export async function checkMissingPermission(user, commandIdOrName, bot, Permission) {
  const commands = bot.commands || new Map();
  let command;
  if (typeof commandIdOrName === 'number') command = Array.from(commands.values()).find(cmd => cmd.id === commandIdOrName);
  else if (typeof commandIdOrName === 'string') command = commands.get(commandIdOrName.toLowerCase());
  if (!command) return `❌ Command not found.`;
  let userPermStr = await Permission(user, 'get', 'max');
  if (!userPermStr) userPermStr = 'Guest 0';
  const userPerm = parseInt(userPermStr.split(' ').pop()) || 0;
  const requiredPerm = command.perm || 0;
  if (userPerm < requiredPerm) return `❌ **You do not have permission** to use this command. (Required: **${requiredPerm}**, Yours: **${userPerm}**)`;
  return null;
}

export function checkMissingCommandProperty(commandIdOrName, bot) {
  const requiredProps = ['name', 'usage', 'perm', 'description', 'execute', 'cooldown', 'id', 'category'];
  const commands = bot.commands || new Map();
  let command;
  if (typeof commandIdOrName === 'number') command = Array.from(commands.values()).find(cmd => cmd.id === commandIdOrName);
  else if (typeof commandIdOrName === 'string') command = commands.get(commandIdOrName.toLowerCase());
  if (!command) return ['command'];
  const missing = [];
  for (const prop of requiredProps) {
    if (!(prop in command)) missing.push(prop);
  }
  return missing;
}
