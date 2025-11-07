import { 
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
} from "discord.js";
import { helper }  from '../utils/helper.js';
import log from '../utils/logger.js';
//import { vote, newMissionButtons } from './missionTimer.js';
import { scheduleDelete } from '../utils/deleteScheduler.js';
import { saveSubmittedLinks, submittedLinks } from './shipTracker.js';
import config from '../config.js';

const buttonHandlers = new Map();
const selectHandlers = new Map();
const modalHandlers = new Map();
const textHandlers = new Map();

export const registerTextHandlers = async (newHandlers = {}) => {
  for (const [id, fn] of Object.entries(newHandlers)) textHandlers.set(id, fn);
};

export const unregisterTextHandler = (id, rows = null) => {
  if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "delete") textHandlers.delete(id);
  else if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "edit" && rows) {
    for (const row of rows) {
      for (const c of row.components) {
        if (c.data.custom_id === id) c.setCustomId("disabled");
      }
    }
  }
};

export const registerButtonHandlers = async (newHandlers = {}) => {
  for (const [id, fn] of Object.entries(newHandlers)) buttonHandlers.set(id, fn);
};
export const unregisterButtonHandler = (id, rows = null) => {
  if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "delete") buttonHandlers.delete(id);
  else if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "edit" && rows) {
    for (const row of rows) {
      for (const c of row.components) {
        if (c.data.custom_id === id) c.setCustomId("disabled");
      }
    }
  }
};

export const registerSelectHandlers = async (newHandlers = {}) => {
  for (const [id, fn] of Object.entries(newHandlers)) selectHandlers.set(id, fn);
};
export const unregisterSelectHandler = (id, rows = null) => {
  if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "delete") selectHandlers.delete(id);
  else if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "edit" && rows) {
    for (const row of rows) {
      for (const c of row.components) {
        if (c.data.custom_id === id) c.setCustomId("disabled");
      }
    }
  }
};

export const registerModalHandlers = async (newHandlers = {}) => {
  for (const [id, fn] of Object.entries(newHandlers)) modalHandlers.set(id, fn);
};
export const getModalHandler = (customId) => modalHandlers.get(customId);
export const unregisterModalHandler = (id, rows = null) => {
  if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "delete") modalHandlers.delete(id);
  else if (config.PREFER_DELETE_OR_EDIT_COMPONENT === "edit" && rows) {
    for (const row of rows) {
      for (const c of row.components) {
        if (c.data.custom_id === id) c.setCustomId("disabled");
      }
    }
  }
};

const handleInteractionCreate = (bot) => {
  bot.on('interactionCreate', async (interaction) => {
    try {
      if ((interaction.isButton || interaction.isStringSelectMenu() || interaction.isModalSubmit()) && interaction.customId === 'disabled') return interaction.reply({ content: '🔒 Component has expired or disabled, Please try a new one.', ephemeral: true });
      const user = await helper.loadUsernameByAccountId(interaction.user.id);

      // Slash commands
      if (interaction.isChatInputCommand()) {
        if (!user) return interaction.reply({ content: '❌ **Not authorized to use this interaction**.', ephemeral: true });
        const command = bot.slashCommands?.get(interaction.commandName);
        if (!command) return interaction.reply({ content: '❌ **Command not found** (register bug).', ephemeral: true });
        const dependencies = await helper.resolveDependencies(command.dependencies);
        await command.execute(interaction, user, dependencies);
        return;
      }

      // Custom buttons
      if (interaction.isButton() && buttonHandlers.has(interaction.customId)) {
        if (!user) return interaction.reply({ content: '❌ **Not authorized to use this interaction**.', ephemeral: true });
        return await buttonHandlers.get(interaction.customId)(interaction);
      }

      // Custom select menu
      if (interaction.isStringSelectMenu() && selectHandlers.has(interaction.customId)) {
        if (!user) return interaction.reply({ content: '❌ **Not authorized to use this interaction**.', ephemeral: true });
        return await selectHandlers.get(interaction.customId)(interaction);
      }

      // Custom modal
      if (interaction.isModalSubmit() && modalHandlers.has(interaction.customId)) {
        if (!user) return interaction.reply({ content: '❌ **Not authorized to use this interaction**.', ephemeral: true });
        return await modalHandlers.get(interaction.customId)(interaction);
      }

      // Reaction roles
      if (interaction.isButton() && interaction.customId.startsWith('role_')) {
        if (!user) return interaction.reply({ content: '❌ **Not authorized to use this interaction**.', ephemeral: true });
        const roleId = interaction.customId.replace('role_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!role || !member) {
          return await interaction.reply({
            content: `⚠️ Role or member not found.`,
            ephemeral: true
          });
        }
        const hasRole = member.roles.cache.has(role.id);
        if (hasRole) {
          await member.roles.remove(role);
          await interaction.reply({
            content: `❌ Removed role **\`${role.name}\`**.`,
            ephemeral: true
          });
        } else {
          await member.roles.add(role);
          await interaction.reply({
            content: `✅ Added role **\`${role.name}\`**.`,
            ephemeral: true
          });
        }
      }

      // Forgot password buttons
      if (interaction.isButton() && (interaction.customId.startsWith('resetpw-') || interaction.customId.startsWith('blockip-'))) {
        if (!user) return interaction.reply({ content: '❌ **Not authorized to use this interaction**.', ephemeral: true });
        const [action, username, ip] = interaction.customId.split('-');
        const user = await helper.loadData(username);
        if (!user) return;
        if (action === 'resetpw') {
          const password = helper.newToken(16);
          user.account.password = password;
          await helper.saveData(username, user);
          const replyMsg = await interaction.reply({
            content: `🔑 **New password for \`${username}\`**:\n||${password}||`,
            fetchReply: true
          });
          await scheduleDelete(bot, interaction.channelId, replyMsg.id, 15000);
          await scheduleDelete(bot, interaction.channelId, interaction.message.id, 15000);
        }
        if (action === 'blockip') {
          user.account.blockedIP ??= [];
          if (!user.account.blockedIP.includes(ip)) {
            user.account.blockedIP.push(ip);
            await helper.saveData(username, user);
          }
          const replyMsg = await interaction.reply({
            content: `🚫 **IP \`${ip}\` blocked for \`${username}\`**`,
            fetchReply: true
          });
          await scheduleDelete(bot, interaction.channelId, replyMsg.id, 15000);
          await scheduleDelete(bot, interaction.channelId, interaction.message.id, 15000);
        }
      }

      // Logins
      if (interaction.isButton() && interaction.customId.startsWith("approveLogin-") || interaction.customId.startsWith("denyLogin-") || interaction.customId.startsWith("blockIP-")) {
        const [action, username, tokenOrIp] = interaction.customId.split("-");
        try {
          const data = await helper.loadData(username);
          const account = data?.account;
          if (!account) return interaction.reply({ content: "[404] User not found.", ephemeral: true });
          switch (action) {
            case "approveLogin":
              if (account.pendingLogin?.[tokenOrIp]) {
                account.pendingLogin[tokenOrIp].approved = true;
                await helper.saveData(username, data);
                interaction.update({
                  content: `✅ Login approved! Your session will automatically continue in the browser.`,
                  components: [],
                  embeds: []
                });
              }
            break;
            case "denyLogin":
              if (account.pendingLogin?.[tokenOrIp]) delete account.pendingLogin[tokenOrIp];
              await saveData(username, data);
              interaction.update({ content: `❌ Login denied for ${username}. User can try again.`, components: [], embeds: [] });
              break;
            case "blockIP":
              account.blockedIP ??= [];
              if (!account.blockedIP.includes(tokenOrIp)) account.blockedIP.push(tokenOrIp);
              await helper.saveData(username, data);
              interaction.update({ content: `⛔ IP **\`${tokenOrIp}\`** blocked for **\`${username}\`**.`, components: [], embeds: [] });
              break;
          }
        } catch (err) {
          log(`[-] Login buttons error: ${err}`, "error");
          interaction.reply({ content: "[500] Internal error.", ephemeral: true });
        }
      }

      // Delete all DM message
      if (interaction.customId.startsWith("deleteAllDM-")) {
        const username = interaction.customId.split("-")[1];
        try {
          const user = await bot.users.fetch(interaction.user.id);
          if (!user) return interaction.reply({ content: "❌ User not found.", ephemeral: true });
          const dm = await user.createDM();
          let lastId;
          let totalDeleted = 0;
          while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            const messages = await dm.messages.fetch(options);
            if (!messages.size) break;
            for (const msg of messages.values()) {
              if (msg.author.id === bot.user.id) {
                try {
                  await msg.delete();
                  totalDeleted++;
                } catch (err) {
                  log(`[-] Failed to delete message ${msg.id}: ${err}`);
                }
              }
            }
            lastId = messages.last()?.id;
            if (!lastId) break;
          }
          interaction.update({
            content: `✅ Deleted **\`${totalDeleted}\`** messages.`,
            components: [],
            embeds: [],
            ephemeral: true
          });
          log(`[+] Deleted ${totalDeleted} DM messages for ${username}`);
        } catch (err) {
          log(`[-] Failed to delete DMs: ${err}`);
          interaction.reply({ content: "❌ Failed to delete DM messages.", ephemeral: true });
        }
      }

      /* Mission votes
      if (interaction.isButton() && ["vote_pits", "vote_canary", "vote_vulture"].includes(interaction.customId)) {
        const key = interaction.customId.split("_")[1];
        if (vote(interaction.user.id, key, lastState)) await interaction.update({ components: newMissionButtons() });
      }
      */
      // Ship tracker Download JSON
      if (interaction.isButton() && interaction.customId === "shiptracker_download_json") {
        const data = await helper.fetchShipList();
        const fileName = `${Date.now()}_ships.json`;
        return interaction.reply({
          files: [{
            attachment: Buffer.from(JSON.stringify(data, null, 2)),
            name: fileName
          }],
          ephemeral: true
        });
      }
      // Ship tracker Search button
      if (interaction.isButton() && interaction.customId === "shiptracker_search") {
        const modal = new ModalBuilder()
          .setCustomId("modal_ship_search")
          .setTitle("Search Ship")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("ship_name")
                .setLabel("Enter ship name or ID")
                .setStyle(1)
                .setRequired(true)
            )
          );
        return interaction.showModal(modal);
      }
      // Ship tracker Submit button
      if (interaction.isButton() && interaction.customId === "shiptracker_submit") {
        const modal = new ModalBuilder()
          .setCustomId("modal_ship_submit")
          .setTitle("Submit Ship Link")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("ship_link")
                .setLabel("Paste your ship link")
                .setStyle(1)
                .setRequired(true)
            )
          );
        return interaction.showModal(modal);
      }
      // Ship tracker Search modal
      if (interaction.isModalSubmit() && interaction.customId === "modal_ship_search") {
        const query = interaction.fields.getTextInputValue("ship_name").toLowerCase();
        const data = await helper.fetchShipList();
        if (!data?.ships) return interaction.reply({ content: "❌ No ships available right now.", ephemeral: true });
        const match = Object.values(data.ships)
          .map((s, idx) => ({ ...s, ourId: idx + 1 }))
          .find(s =>
            s.team_name?.includes(query) ||
            s.ourId?.toString() === query ||
            s.ship_id?.toString() === query
          );
        if (match) {
          return interaction.reply({
            content: `🔎 Found: [\`${match.ourId}\`] **\`${match.team_name}\`** (\`${match.player_count}\` players, ShipID: \`${match.ship_id}\`).`,
            ephemeral: true
          });
        } else return interaction.reply({ content: "❌ No ship found with that name or ID.", ephemeral: true });
      }
      // Ship tracker Submit modal
      if (interaction.isModalSubmit() && interaction.customId === "modal_ship_submit") {
        const link = interaction.fields.getTextInputValue("ship_link");
        const data = await helper.fetchShipFromLink(link);
        if (!data.valid) return interaction.reply({ content: "❌ Invalid ship link.", ephemeral: true });
        submittedLinks.set(link, { valid: true, data });
        saveSubmittedLinks();
        return interaction.reply({
          content: `✅ Ship link submitted:\n• Name: **\`${data.shipName}\`**.\n• Link: **\`${link}\`**.\nThank you!`,
          ephemeral: true
        });
      }
      // Ship tracker Selector selected
      if (interaction.isStringSelectMenu() && interaction.customId === "shiptracker_submitted_ships") {
        const selectedValue = interaction.values[0];
        if (selectedValue === "last_refresh") return await interaction.reply({ content: "This is the last refresh timestamp.", ephemeral: true });
        await interaction.reply({ content: `\`\`\`${selectedValue}\`\`\``, ephemeral: true });
      }
    } catch (error) {
      log(`[interactionCreate.js]: ${error.stack || error}`, 'error');
      if (interaction.replied || interaction.deferred) await interaction.followUp({ content: `❌ [interactionCreate.js]: \`${error.message}\`.`, ephemeral: true });
      else await interaction.reply({ content: `❌ [interactionCreate.js]: \`${error.message}\`.`, ephemeral: true });
    }
  });
  log(`[interactionCreate.js] registered.`, "success");
};

export default handleInteractionCreate;