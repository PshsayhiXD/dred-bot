import { Client, GatewayIntentBits, Options } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import https from 'https';

import handleInteractionCreate from './events/interactionCreate.js';

import registerPrefixCommands from './commands/register.js';
import registerSlashCommands from './commands/Slash/register.js';

import setupReactionRoles from './events/reactionRole.js';
import setupRegionTimer from './events/regionTimer.js';
import setupNewJoinMember from './events/newJoinUser.js';
import setupLeavingMember from './events/leavingMember.js';
//import setupMissionTimer from './events/missionTimer.js';
import setupShipTracker from './events/shipTracker.js';
import setupCurrentVersion from './events/currentVersion.js';
import setupPvpEvent from './events/pvpEvent.js';
import setupWSS from './wss.js';
import setupCommandWatcher from './utils/watcher.js';

import { loadAllItems } from './modules/items/index.js';
import { loadAllSkills } from './modules/skills/index.js';
import { loadAllResearchs } from './modules/researchs/index.js';
import { loadAllAchievements } from './modules/achievements/index.js';
import { loadAllEnchants } from './modules/enchants/index.js';
import { loadAllRanks } from './modules/ranks/index.js';
import { loadAllRecipes } from './modules/recipes/index.js';
import { loadAllQuests } from './modules/quests/index.js';
import { loadAllPets } from './modules/pets/index.js';
import { loadAllJobs } from './modules/jobs/index.js';

import { sendDashboardEmbed } from './events/dashboard.js';

import { getAllCommand, getDupeIdCommands } from './utils/getcommand.js';

import log from './utils/logger.js';
import paths from './utils/path.js';
import config from './config.js';
import * as db from './utils/db.js';
import { helper } from './utils/helper.js';
import { rescheduleAll } from './utils/deleteScheduler.js';
import thisFile from './utils/thisFile.js';

import { Middleware, notFound } from './middleware/app.js';
import * as createRoute from './routes/app/index.js';

import { checkMissingArgs, checkMissingPermission } from './commands/usage.js';
import { commandEmbed, commandReRunButton } from './utils/commandComponent.js';

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
    log(`\n[${thisFile(import.meta.url)}] Available Routes:`, 'title');
    if (!allRoutes.length) return log('  (no routes found)');
    allRoutes.forEach(r => {
      log(`  [${r.method}] ${r.path} → ${baseURL}${r.path}`, 'info');
    });
  };

  const localIP = await helper.getLocalIP();
  const option = {
    key: await db.readText(paths.certs.key),
    cert: await db.readText(paths.certs.cert),
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
  }, 60 * 1000);
  Middleware(app);
  await createRoute.default(app, { ...db, log, helper }, bot);
  notFound(app);

  logAllRoutes(`https://${localIP}:${config.HTTPS_PORT}`);
  const server = https.createServer(option, app);

  bot.on('clientReady', async () => {
    log(`[${thisFile(import.meta.url)}] Client is ready.`);
    setInterval(() => helper.cleanOldResearchImages(), config.CLEAN_RESEARCH_TREE_MS);
    setInterval(async () => await helper.clearGetFileContentFiles(), config.CLEAR_GETFILECONTENTFILES_MS);
    await handleInteractionCreate(bot);
    await sendDashboardEmbed(bot);
    await loadAllItems();
    await loadAllSkills();
    await loadAllEnchants();
    await loadAllResearchs();
    await loadAllAchievements();
    await loadAllRanks();
    await loadAllRecipes();
    await loadAllQuests();
    await loadAllPets();
    await loadAllJobs();
    await registerSlashCommands(bot, 'n');
    await registerPrefixCommands(bot, 'all');
    await setupReactionRoles(bot);
    await setupPvpEvent(bot);
    await setupRegionTimer(bot);
    await setupNewJoinMember(bot);
    await setupLeavingMember(bot);
    //await setupMissionTimer(bot);
    await setupShipTracker(bot);
    await rescheduleAll(bot);
    await setupCurrentVersion(bot);
    await setupCommandWatcher(bot);
    const allCommand = await getAllCommand(bot);
    const dupedIdCommand = await getDupeIdCommands(bot);
    log(`[${thisFile(import.meta.url)}] Logged in as ${bot.user.tag} (ID: ${bot.user.id})`);
    log({ allCommandId: allCommand });
    log({ dupedIdCommands: dupedIdCommand });
    setInterval(() => helper.refundExpiredListings(), config.MARKETPLACE_TICKRATE);
  });
  bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    messageCache.set(message.id, {
      content: message.content,
      author: message.author.tag,
      timestamp: message.createdTimestamp,
    });
    if (message.author.id !== '1119461487833010226' && message.channel.id !== config.BotcommandChannelID && message.channel.id !== config.AdminCommandChannelID) return;
    if (!message.content.startsWith(config.PREFIX)) return;
    if (message.content === config.PREFIX) return;
    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    let command = args.shift()?.toLowerCase();
    let originalCommand = command;
    let commands = bot.commands?.get(command);
    if (!commands) {
      commands = [...bot.commands?.values()].find(cmd => Array.isArray(cmd.aliases) && cmd.aliases.includes(command));
      if (commands) command = commands.name;
    }
    let username = null;
    let data = null;
    const accountId = message.author.id;
    data = db.loadDataByAccountId(accountId);
    if (data && Object.keys(data).length > 0) username = db.loadUsernameByAccountId(accountId);
    if (!data && !['login', 'anonymous', ...(commands['login']?.aliases || []), ...(commands['anonymous']?.aliases || [])].includes(command)) {
      const embed = await commandEmbed({
        title: '❌ Not logged in',
        description: `❌ **You are not logged in**. Please use \`${config.PREFIX}login <account> <token>\` to log in or \`${config.PREFIX}anonymous\` to use the bot as anonymously.`,
        user: `Not logged in`,
        reward: false,
        message,
      });
      return message.reply({ embeds: [embed] });
    }
    if (!commands || !commands.execute) return;
    const suggestion = (() => {
      const allCommands = [...bot.commands.values()].flatMap(c => [c.name, ...(c.aliases || [])]);
      const commandDist = (a, b) => {
        const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++) dp[i][0] = i;
        for (let j = 0; j <= b.length; j++) dp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
          }
        }
        return dp[a.length][b.length];
      };
      return allCommands.map(cmd => ({ cmd, dist: commandDist(cmd, command) })).sort((a, b) => a.dist - b.dist)[0]?.cmd || null;
    })();
    if (suggestion && !commands) {
      const embed = await commandEmbed({
        title: `❌ Command not found`,
        description: `Command: **\`${command}\`**.\nDid you mean: **\`${suggestion}\`**?`,
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
    const missingPerm = await checkMissingPermission(username, command, bot, helper.Permission);
    const missingArgs = checkMissingArgs(command, bot, { args, attachments: message.attachments.toJSON() });
    let cooldownResult = null;
    let globalCooldownResult = null;
    try {
      cooldownResult = await helper.Cooldown(username, command);
      if (!cooldownResult) await helper.newCooldown(username, command, commands.cooldown);
      else {
        const embed = await commandEmbed({ title: `⏳ Cooldown`, description: `You must wait **${await timeLeft(cooldownResult.remaining)}** before using \`${config.PREFIX}${command}\` again.`, user: username, reward: false, message });
        return message.reply({ embeds: [embed] });
      }
    } catch (err) {
      await helper.newCooldown(username, command, commands.cooldown);
    }
    try {
      globalCooldownResult = await helper.GlobalCooldown(username, command);
      if (!globalCooldownResult) await helper.newGlobalCooldown(username, command, commands.globalCooldown);
      else {
        const embed = await commandEmbed({
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
      const embed = await commandEmbed({ title: `❌ Permission Denied`, description: missingPerm, user: username, reward: false, message });
      return message.reply({ embeds: [embed] });
    }
    if (missingArgs) {
      const embed = await commandEmbed({ title: `❌ Invalid Usage`, description: missingArgs, user: username, reward: false, message });
      return message.reply({ embeds: [embed] });
    }
    try {
      await helper.deleteAllExpiredBoosts(username);
      const originalReply = message.reply.bind(message);
      message.reply = async (...replyArgs) => {
        let res;
        try { res = await originalReply(...replyArgs);
        } catch {
          try { res = await message.channel.send(...replyArgs);
          } catch (err) {
            log(`[message.reply.monkeypatch] failed to send fallback: ${err.message}`, 'warn');
            return null;
          }
        }
        try {
          const rerunBtn = commandReRunButton(bot, message, command, args);
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
      data = await db.loadData(username);
      data.command_execute = (data.command_execute || 0) + 1;
      await db.saveData(username, data);
      try { await commands.execute(message, args, username, originalCommand, dependencies);
      } finally {
        message.reply = originalReply;
      }
    } catch (error) {
      log(`[-] Error executing ${command}: ${error.stack}`, 'error');
      const parse = async amount => await helper.parseBet(amount, 0);
      const refund = (commands.category === 'gambling' || commands.category === 'economy') && typeof args[0] === 'string' ? (await parse(args[0])).bet || 0 : 0;
      log(`[-] refunded ${username} ${refund}.`);
      await helper.addDredcoin(username, refund);
      try {
        await message.channel.send({ content: `❌ **Error while executing \`${command}\`:**\n` +
            `\`\`\`${error.message}\`\`\`\n` +
            `> Please report this to a developer.\n` +
            (refund > 0 ? `💸 You have been refunded **\`${await helper.formatAmount(refund)}${config.CURRENCY_SYMBOL}\`**.` : ''),
        });
      } catch (err) {
        log(`[message.reply.error] failed to send fallback: ${err.message}`, 'warn');
      }
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
    log(`[${thisFile(import.meta.url)}] Shard ${id} disconnected ${event}`, 'warn');
  });

  server.listen(config.HTTPS_PORT, localIP, async () => {
    log(`[${thisFile(import.meta.url)}] Server is running on https://${localIP}:${config.HTTPS_PORT}`);
    bot.login(helper.key.DISCORD_BOT_TOKEN);
  });

  await setupWSS(server);
})();
