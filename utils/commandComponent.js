import { 
  EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, 
  StringSelectMenuBuilder, 
  ModalBuilder, TextInputBuilder,
  AttachmentBuilder
} from 'discord.js';
import config from '../config.js';
import log from '../utils/logger.js';
import { registerButtonHandlers, registerSelectHandlers, registerModalHandlers } from '../tasks/interactionCreate.js';
export const commandEmbed = async ({ 
  title = 'null',
  description = 'null', 
  color = '#2f3136', 
  footer = null, 
  thumbnail = config.BotAvatarURL, 
  image = null, 
  fields = [], 
  user = null, 
  message = null,
  reward = false,
  dep = [],
} = {}) => {
  try {
    if (typeof color === 'string') {
      color = color.replace(/^#/, '');
      if (color.length === 8) color = color.slice(0, 6);
      color = parseInt(color, 16);
    }
    if (typeof description !== 'string') description = String(description);
    if (description.length > 4096) description = description.slice(0, 4093) + '...';
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
    let rewardText = '';
    if (reward && Array.isArray(config.COMMANDS_REWARD) && config.COMMANDS_REWARD.length >= 2 && typeof dep.giveExp === 'function' && typeof dep.giveDredcoin === 'function') {
      const xpMin = config.COMMANDS_REWARD[0];
      const xpMax = config.COMMANDS_REWARD[1];
      const xp = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
      rewardText += `+${xp} XP`;
      await dep.giveExp(user, xp);
      if (config.COMMANDS_REWARD.length >= 4) {
        const coinMin = config.COMMANDS_REWARD[2];
        const coinMax = config.COMMANDS_REWARD[3];
        const coins = Math.floor(Math.random() * (coinMax - coinMin + 1)) + coinMin;
        rewardText += ` • +${coins}${config.CURRENCY_SYMBOL}`;
        await dep.giveDredcoin(user, coins);
      }
    }
    if (footer?.text) embed.setFooter(footer);
    else if (user) {
      const now = new Date();
      const formattedTime = now
        .toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .toLowerCase();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      let iconURL = config.BotAvatarURL;
      if (message?.author?.displayAvatarURL) iconURL = message.author.displayAvatarURL({ dynamic: true, size: 32 });
      else if (message?.user?.displayAvatarURL) iconURL = message.user.displayAvatarURL({ dynamic: true, size: 32 });
      embed.setFooter({
        text: `${user}${rewardText ? ' • ' + rewardText : ''} • ${formattedDate} at ${formattedTime}`,
        iconURL,
      });
    }
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (typeof image === 'string' && image.length > 0) embed.setImage(image);
    if (fields?.length) embed.addFields(fields);
    return embed;
  } catch (error) {
    log(`[commandEmbed]: ${error.stack}`, 'error');
    return new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while creating the embed.');
  }
};
export const commandButtonComponent = async (buttonDefs = []) => {
  const rows = [];
  const handlers = {};
  const buildRow = buttons => {
    const row = new ActionRowBuilder();
    for (const btn of buttons.slice(0, 5)) {
      const button = new ButtonBuilder().setLabel(btn.label || 'Button').setStyle(btn.style ?? ButtonStyle.Primary);
      const customId = btn.customId || `btn_${Math.random().toString(36).slice(2, 10)}`;
      if (btn.style === ButtonStyle.Link && btn.url) button.setURL(btn.url);
      else {
        button.setCustomId(customId);
        if (typeof btn.onClick === 'function') handlers[customId] = btn.onClick;
      }
      if (btn.emoji) button.setEmoji(btn.emoji);
      if (btn.disabled) button.setDisabled(true);
      row.addComponents(button);
    }
    return row;
  };
  if (Array.isArray(buttonDefs[0])) {
    for (const row of buttonDefs.slice(0, 5)) rows.push(buildRow(row));
  } else rows.push(buildRow(buttonDefs));
  registerButtonHandlers(handlers);
  return rows;
};
export const commandSelectComponent = async (menuDefs = []) => {
  const rows = [];
  const handlers = {};
  const buildRow = menu => {
    const row = new ActionRowBuilder();
    const select = new StringSelectMenuBuilder()
      .setPlaceholder(menu.placeholder || 'Choose an option')
      .setMinValues(menu.minValues ?? 1)
      .setMaxValues(menu.maxValues ?? 1);
    const customId = menu.customId || `sel_${Math.random().toString(36).slice(2, 10)}`;
    select.setCustomId(customId);
    if (typeof menu.onSelect === 'function') handlers[customId] = menu.onSelect;
    for (const opt of (menu.options || []).slice(0, 25)) {
      const label = (opt.label || 'Option').toString().slice(0, 100);
      const value = (opt.value || opt.label || `val_${Math.random().toString(36).slice(2, 8)}`).toString().slice(0, 100);
      const description = opt.description?.toString().slice(0, 100);
      if (value.length < 1 || label.length < 1) continue;
      select.addOptions({
        label,
        value,
        description,
        emoji: opt.emoji,
        default: opt.default,
      });
    }
    row.addComponents(select);
    return row;
  };
  if (Array.isArray(menuDefs[0])) {
    for (const menu of menuDefs.slice(0, 5)) rows.push(buildRow(menu));
  } else rows.push(buildRow(menuDefs));
  registerSelectHandlers(handlers);
  return rows;
};
export const commandModal = async (modalDef = {}) => {
  const { title, customId, inputs, onSubmit } = modalDef;
  const modalId = customId || `mod_${Math.random().toString(36).slice(2, 10)}`;
  const modal = new ModalBuilder().setCustomId(modalId).setTitle(title || 'Modal');
  for (const input of inputs || []) {
    const textInput = new TextInputBuilder()
      .setCustomId(input.customId || `in_${Math.random().toString(36).slice(2, 10)}`)
      .setLabel(input.label || 'Input')
      .setStyle(input.style ?? TextInputStyle.Short)
      .setRequired(input.required ?? true)
      .setMinLength(input.minLength ?? 1)
      .setMaxLength(input.maxLength ?? 4000)
      .setPlaceholder(input.placeholder || '');
    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
  }
  registerModalHandlers({ [modalId]: onSubmit });
  return modal;
};
export const commandReRunButton = (bot, message, command, args) => {
  if (!bot || !message || !command) return null;
  const customId = `run_${crypto.randomUUID()}`;
  const handlers = {};
  handlers[customId] = async interaction => {
    if (interaction.user.id !== message.author.id) return;
    const newMessage = Object.assign(Object.create(message), {
      _rerun: message.id,
      id: Date.now().toString().slice(0, 17),
      createdTimestamp: Date.now(),
      content: `${config.PREFIX}${command} ${args.join(' ')}`,
    });
    bot.emit('messageCreate', newMessage);
    const reactable = !!message.react;
    const replyable = !!message.reply;
    return reactable ? message.react('🔁') : replyable ? message.reply('Done') : null;
  };
  registerButtonHandlers(handlers);
  return new ButtonBuilder().setLabel('🔁 Run again').setStyle(ButtonStyle.Secondary).setCustomId(customId);
};
export const commandEmbedPager = async (embeds, userId) => {
  let i = 0;
  const build = async () => ({
    embeds: [embeds[i]],
    components: await commandButtonComponent([
      {
        label: '⬅️ Prev',
        style: 2,
        onClick: async int => {
          if (int.user.id !== userId) return;
          i = (i - 1 + embeds.length) % embeds.length;
          await int.update(await build());
        },
      },
      {
        label: '➡️ Next',
        style: 2,
        onClick: async int => {
          if (int.user.id !== userId) return;
          i = (i + 1) % embeds.length;
          await int.update(await build());
        },
      },
    ]),
  });
  return await build();
};
export const commandLinkButton = async (label, url, emoji = null) => {
  return await commandButtonComponent([{ label, style: ButtonStyle.Link, url, emoji }]);
};
export const Embed = ({ title = 'Untitled', description = 'No description provided.', color = '#2f3136', footer = null, thumbnail = null, timestamp = true } = {}) => {
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
  if (footer) embed.setFooter(footer);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (timestamp) embed.setTimestamp();
  return embed;
};
export const sendChunks = async (channel, content, isEmbed = true) => {
  const MAX_MESSAGE_LEN = 2000;
  const MAX_EMBED_DESC = 4096;
  const sentMsgs = [];
  const splitText = (text, maxLen) => {
    const chunks = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      const cut = remaining.lastIndexOf("\n", maxLen);
      chunks.push(remaining.slice(0, cut > 0 ? cut : maxLen));
      remaining = remaining.slice(cut > 0 ? cut + 1 : maxLen);
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  };
  if (content instanceof EmbedBuilder) {
    const desc = content.data.description || "";
    const chunks = splitText(desc, MAX_EMBED_DESC);
    for (let i = 0; i < chunks.length; i++) {
      const e = EmbedBuilder.from(content)
        .setDescription(chunks[i])
        .setTitle(i === 0 ? content.data.title : null);
      sentMsgs.push(await channel.send({ embeds: [e] }));
    }
    return sentMsgs;
  }
  if (typeof content === "string") {
    const chunks = splitText(content, MAX_MESSAGE_LEN);
    for (const chunk of chunks) {
      if (isEmbed) {
        const e = new EmbedBuilder().setDescription(chunk).setColor("#2f3136");
        sentMsgs.push(await channel.send({ embeds: [e] }));
      } else {
        sentMsgs.push(await channel.send(chunk));
      }
    }
  }
  return sentMsgs;
};
export const commandAttachment = async (buffer, name = "file.png", type = "image/png") => {
  if (!buffer) throw new Error("commandAttachment: missing buffer");
  return new AttachmentBuilder(buffer, { name, contentType: type });
};