import { Client, GatewayIntentBits, Options } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import https from 'https';
import handleInteractionCreate from './tasks/interactionCreate.js';
import registerPrefixCommands from './commands/command-register.js';
import registerSlashCommands from './commands/Slash/slash-register.js';
import setupReactionRoles from './tasks/reactionRole.js';
import setupRegionTimer from './tasks/regionTimer.js';
import setupNewJoinMember from './tasks/newJoinUser.js';
import setupLeavingMember from './tasks/leavingMember.js';
import setupChangelogs from './tasks/changelogs.js';
import setupMissionTimer from './tasks/missionTimer.js';
import setupShipTracker from './tasks/shipTracker.js';
import setupCurrentVersion from './tasks/currentVersion.js';
import { loadAllItems } from './utils/items/index.js';
import { loadAllSkills } from './utils/skills/index.js';
import { loadAllResearchs } from './utils/researchs/index.js';
import { loadAllAchievements } from './utils/achievements/index.js';
import { loadAllEnchants } from './utils/enchants/index.js';
import setupPvpEvent from './tasks/pvpEvent.js';
import { sendDashboardEmbed } from './tasks/dashboard.js';
import setupWSS from './wss.js';
import { getAllCommand, getDupeIdCommands } from './utils/getcommand.js';
import log from './utils/logger.js';
import config from './config.js';
import { Middleware } from './middleware/app.js';
import * as commandUsage from './commands/command-usage.js';
import * as createRoute from './routes/app/index.js';
import { helper } from './utils/helper.js';
import paths from './utils/path.js';
import * as db from './utils/db.js';
import { rescheduleAll } from './utils/deleteScheduler.js';
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
await (async function () {
  const allRoutes = [],
    mounted = new Map(),
    m = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all'];
  const originalUse = express.application.use;
  express.application.use = function (...args) {
    if (typeof args[0] === 'string' && args[1] && typeof args[1] === 'function' && args[1].stack && Array.isArray(args[1].stack)) mounted.set(args[1], args[0]);
    return originalUse.apply(this, args);
  };
  m.forEach(method => {
    const proto = express.Router.prototype;
    const orig = proto[method];
    proto[method] = function (path, ...handlers) {
      if (!handlers.length || typeof handlers[0] !== 'function') return orig.call(this, path, ...handlers);
      const base = mounted.get(this) || '';
      allRoutes.push({ method: method.toUpperCase(), path: (base + path).replace(/\/+/g, '/') });
      return orig.call(this, path, ...handlers);
    };
  });
  const logAllRoutes = (baseURL = '') => {
    log('\n[bot.js] Available Routes:', 'title');
    if (!allRoutes.length) return log('  (no routes found)');
    allRoutes.forEach(r => {
      log(`  [${r.method}] ${r.path} → ${baseURL}${r.path}`, 'info');
    });
  };

  const localIP = await helper.getLocalIP();
  const option = {
    key: await helper.readText(config.SSL_KEY_PATH),
    cert: await helper.readText(config.SSL_CERT_PATH),
    passphrase: config.CERT_PASSPHRASE,
  };
  const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: ['CHANNEL'],
    makeCache: Options.cacheWithLimits({
      MessageManager: 100,
    }),
  });
  const app = express();
  const messageCache = new Map();
  const replyMap = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [id, msg] of messageCache.entries()) {
      if (now - msg.timestamp > 5 * 60 * 1000) messageCache.delete(id); // 5m
    }
  }, 60 * 1000); // 1m

  await Middleware(app);
  await createRoute.default(app, { ...db, log, helper }, bot);
  logAllRoutes(`https://${localIP}:${config.HTTPS_PORT}`);
  const server = https.createServer(option, app);

  bot.on('clientReady', async () => {
    setInterval(() => helper.cleanOldResearchImages(), config.CLEAN_RESEARCH_TREE_MS);
    await helper.clearGetFileContentFiles();
    await handleInteractionCreate(bot);
    await sendDashboardEmbed(bot);
    await loadAllItems();
    await loadAllSkills();
    await loadAllEnchants();
    await loadAllResearchs();
    await loadAllAchievements();
    await registerSlashCommands(bot, 'n');
    await registerPrefixCommands(bot, 'all');
    await setupReactionRoles(bot);
    await setupPvpEvent(bot);
    await setupRegionTimer(bot);
    await setupNewJoinMember(bot);
    await setupLeavingMember(bot);
    await setupChangelogs(bot);
    await setupMissionTimer(bot);
    await setupShipTracker(bot);
    await rescheduleAll(bot);
    await setupCurrentVersion(bot);
    const allCommand = await getAllCommand(bot);
    const dupedIdCommand = await getDupeIdCommands(bot);
    log(`[bot.js] Logged in as ${bot.user.tag} (ID: ${bot.user.id})`);
    log({ allCommandId: allCommand });
    log({ dupedIdCommands: dupedIdCommand });
    setInterval(() => helper.refundExpiredListings(), config.MARKETPLACE_TICKRATE);
  });
  bot.on('messageCreate', async message => {
    if (message.author.bot) return;
    messageCache.set(message.id, {
      content: message.content,
      author: message.author.tag,
      timestamp: message.createdTimestamp,
    });
    if (message.channel.id !== config.BotcommandChannelID && message.channel.id !== config.AdminCommandChannelID) return;
    if (!message.content.startsWith(config.PREFIX)) return;
    if (message.content === config.PREFIX) return;
    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    let command = args.shift()?.toLowerCase();
    let originalCommand = command;
    let commands = bot.commands?.get(command);
    if (!commands) {
      commands = [...bot.commands.values()].find(cmd => Array.isArray(cmd.aliases) && cmd.aliases.includes(command));
      if (commands) command = commands.name;
    }
    let username = null;
    let data = null;
    const accountId = message.author.id;
    data = helper.loadDataByAccountId(accountId);
    if (data && Object.keys(data).length > 0) username = helper.loadUsernameByAccountId(accountId);
    if (!data && !['login', 'anonymous', ...(commands['login']?.aliases || []), ...(commands['anonymous']?.aliases || [])].includes(command)) {
      const embed = await commandUsage.commandEmbed({
        title: '❌ Not logged in',
        description: `❌ **You are not logged in**. Please use \`${config.PREFIX}login <account> <token>\` to log in or \`${config.PREFIX}anonymous\` to use the bot as anonymously.`,
        user: `Not logged in`,
        reward: false,
        message,
      });
      return message.reply({ embeds: [embed] });
    }
    if (!commands || !commands.execute) return;
    const suggestion = [...bot.commands.values()]
      .flatMap(c => [c.name, ...(c.aliases || [])])
      .sort((a, b) => {
        const d = (x, y) => {
          const c = [];
          for (let i = 0; i <= x.length; i++) {
            let l = i;
            for (let j = 0; j <= y.length; j++) {
              if (i === 0) c[j] = j;
              else if (j > 0) {
                let n = c[j - 1];
                if (x[i - 1] !== y[j - 1]) n = Math.min(Math.min(n, l), c[j]) + 1;
                c[j - 1] = l;
                l = n;
              }
            }
            if (i > 0) c[y.length] = l;
          }
          return c[y.length];
        };
        return (b.length - d(b, command)) / b.length - (a.length - d(a, command)) / a.length;
      })[0];
    if (suggestion && !commands) {
      const embed = await commandUsage.commandEmbed({
        title: `❌ Command not found`,
        description: `**Command**: \`${command}\`\n**Did you mean**: \`${suggestion}\`?`,
        color: '#FF0000',
        user: username,
        reward: false,
        message,
      });
      return message.reply({ embeds: [embed] });
    }
    const dependencies = await helper.resolveDependencies(commands.dependencies);
    const timeLeft = ms => {
      return helper.formatTime(ms);
    };
    const missingPerm = await commandUsage.checkMissingPermission(username, command, bot, helper.Permission);
    const missingArgs = commandUsage.checkMissingArgs(command, bot, { args, attachments: message.attachments.toJSON() });
    let cooldownResult = null;
    let globalCooldownResult = null;
    try {
      cooldownResult = await helper.Cooldown(username, command);
      if (!cooldownResult) await helper.newCooldown(username, command, commands.cooldown);
      else {
        const embed = await commandUsage.commandEmbed({ title: `⏳ Cooldown`, description: `You must wait **${await timeLeft(cooldownResult.remaining)}** before using \`${config.PREFIX}${command}\` again.`, user: username, reward: false, message });
        return message.reply({ embeds: [embed] });
      }
    } catch (err) {
      await helper.newCooldown(username, command, commands.cooldown);
    }
    try {
      globalCooldownResult = await helper.GlobalCooldown(username, command);
      if (!globalCooldownResult) await helper.newGlobalCooldown(username, command, commands.globalCooldown);
      else {
        const embed = await commandUsage.commandEmbed({
          title: `⏳ Global Cooldown`,
          description: `You have recently used this command. Please wait **${await timeLeft(globalCooldownResult.remaining)}** before using \`${config.PREFIX}${command}\` again.`,
          user: username,
          reward: false,
          message,
        });
        return message.reply({ embeds: [embed] });
      }
    } catch (err) {
      await helper.newGlobalCooldown(username, command, commands.globalCooldown);
    }
    if (missingPerm) {
      const embed = await commandUsage.commandEmbed({ title: `❌ Permission Denied`, description: missingPerm, user: username, reward: false, message });
      return message.reply({ embeds: [embed] });
    }
    if (missingArgs) {
      const embed = await commandUsage.commandEmbed({ title: `❌ Invalid Usage`, description: missingArgs, user: username, reward: false, message });
      return message.reply({ embeds: [embed] });
    }
    try {
      await helper.deleteAllExpiredBoosts(username);
      const originalReply = message.reply.bind(message);
      message.reply = async (...replyArgs) => {
        const res = await originalReply(...replyArgs);
        try {
          const rerunBtn = commandUsage.commandReRunButton(bot, message, command, args);
          if (rerunBtn) {
            const existingComponents = res.components || [];
            existingComponents.push({ type: 1, components: [rerunBtn] });
            await res.edit({ components: existingComponents });
          }
        } catch (e) {
          log(`[message.reply.monkeypatch] ${e.stack}`, 'error');
        }
        return res;
      };
      try {
        await commands.execute(message, args, username, originalCommand, dependencies);
      } finally {
        message.reply = originalReply;
      }
    } catch (error) {
      log(`[-] Error executing ${command}: ${error.stack}`, 'error');
      const parse = async amount => await helper.parseBet(amount, 0);
      const refund = (commands.category === 'gambling' || commands.category === 'economy') && typeof args[0] === 'string' ? (await parse(args[0])).bet || 0 : 0;
      log(`[-] refunded ${username} ${refund}.`);
      await helper.addDredcoin(username, refund);
      await message.reply({
        content:
          `❌ **Error while executing \`${command}\`:**\n` + `\`\`\`${error.message}\`\`\`\n` + `> Please report this to a developer.\n` + (refund > 0 ? `💸 You have been refunded **\`${await helper.formatAmount(refund)}${config.CURRENCY_SYMBOL}\`**.` : ''),
      });
    }
  });
  bot.on('messageUpdate', async (_old, msg) => {
    if (msg.partial) return;
    bot.emit('messageCreate', msg);
  });
  bot.on('messageDelete', async msg => {
    const replyId = replyMap.get(msg.id);
    if (!replyId || !msg.channel) return;
    try {
      const reply = await msg.channel.messages.fetch(replyId);
      await reply.delete();
    } catch (err) {}
    replyMap.delete(msg.id);
  });
  process.on('unhandledRejection', console.error);
  process.on('uncaughtException', console.error);
  bot.on('error', console.error);
  bot.on('shardDisconnect', (event, id) => {
    console.warn(`[bot.js] Shard ${id} disconnected`, event);
  });

  server.listen(config.HTTPS_PORT, localIP, async () => {
    log(`[bot.js] Server is running on https://${localIP}:${config.HTTPS_PORT}`);
    bot.login(helper.key.DISCORD_BOT_TOKEN);
  });

  await setupWSS(server);
})();
