import { EmbedBuilder, ActionRowBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, AttachmentBuilder } from 'discord.js';
import config from '../config.js';
import log from '../utils/logger.js';
import { getUserStock, getGlobalStock, getNextGlobalRestock } from "./shop.js"; 
import { registerButtonHandlers, unregisterButtonHandler, registerSelectHandlers, unregisterSelectHandler, registerModalHandlers, unregisterModalHandler } from '../events/interactionCreate.js';
export const commandEmbed = async ({ title = 'null', description = 'null', color = '#2f3136', footer = null, thumbnail = config.BotAvatarURL, image = null, fields = [], user = null, message = null, reward = false, dep = [] } = {}) => {
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
export const commandConfirmationButton = async (bot, message, prompt = 'Are you sure?', timeout = 60000) => {
  if (!bot || !message) return null;
  const customIdYes = `confirm_yes_${crypto.randomUUID()}`;
  const customIdNo = `confirm_no_${crypto.randomUUID()}`;
  const handlers = {};
  handlers[customIdYes] = async interaction => {
    if (interaction.user.id !== message.author.id) return;
    await interaction.update({ content: 'Confirmed ✅', components: [] });
    interaction.client.emit('commandConfirmation', true, interaction);
  };
  handlers[customIdNo] = async interaction => {
    if (interaction.user.id !== message.author.id) return;
    await interaction.update({ content: 'Cancelled ❌', components: [] });
    interaction.client.emit('commandConfirmation', false, interaction);
  };
  registerButtonHandlers(handlers);
  const row = await commandButtonComponent([
    {
      label: 'Yes',
      emoji: '✅',
      style: 3,
      customId: customIdYes,
    },
    {
      label: 'No',
      emoji: '❌',
      style: 4,
      customId: customIdNo,
    },
  ]);
  setTimeout(async () => {
    try {
      const msg = await message.fetch();
      if (msg.components.length > 0) {
        await msg.edit({ content: 'Confirmation timed out ⏲️', components: [] });
        return unregisterButtonHandlers([customIdYes, customIdNo]);
      }
    } catch (error) {
      log(`[commandConfirmationButton] Timeout edit failed: ${error}`, 'error');
    }
  }, timeout);
  return row;
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
    try {
      if (reactable && !message.reactions.cache.some(r => r.emoji.name === '🔁' && r.me)) return await message.react('🔁');
      else if (replyable) return await message.reply('Done');
    } catch (error) {
      if (error.code === 10008) log(`[commandReRunButton] Original message is unknown or deleted, skipping react/reply.`, 'warn');
      else log(`[commandReRunButton] ${error}`, 'error');
    }
  };
  registerButtonHandlers(handlers);
  return new ButtonBuilder().setLabel('🔁 Run again').setStyle(ButtonStyle.Secondary).setCustomId(customId);
};
export const commandEmbedPager = async (embeds, userId, pageFormat = 'Page {current}/{max}') => {
  let i = 0;
  const build = async () => {
    return {
      embeds: [embedWithPage],
      components: await commandButtonComponent([
        {
          label: '⬅️ Prev',
          style: 2,
          customId: `page_prev_${crypto.randomUUID()}`,
          onClick: async int => {
            if (int.user.id !== userId) return;
            i = (i - 1 + embeds.length) % embeds.length;
            await int.update(await build());
          },
        },
        {
          label: `Page ${i + 1} / ${embeds.length}`,
          style: 1,
          customId: `page_info_${crypto.randomUUID()}`,
          disabled: true,
        },
        {
          label: '➡️ Next',
          style: 2,
          customId: `page_next_${crypto.randomUUID()}`,
          onClick: async int => {
            if (int.user.id !== userId) return;
            i = (i + 1) % embeds.length;
            await int.update(await build());
          },
        },
      ]),
    };
  };
  return await build();
};
export const commandLinkButton = async (label, url, emoji = null) => {
  return await commandButtonComponent([{ label, style: ButtonStyle.Link, url, emoji }]);
};
export const Embed = ({ title = 'Untitled', description = 'No description provided.', color = '#2f3136', footer = null, thumbnail = null, timestamp = true } = {}) => {
  const e = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
  if (footer) e.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  if (thumbnail) e.setThumbnail(thumbnail);
  if (timestamp) e.setTimestamp();
  return e;
};
export const sendChunks = async (channel, content, isEmbed = true) => {
  const MAX_MESSAGE_LEN = 2000;
  const MAX_EMBED_DESC = 4096;
  const sentMsgs = [];
  const splitText = (text, maxLen) => {
    const chunks = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      let cut = remaining.lastIndexOf('\n', maxLen);
      if (cut <= 0) cut = maxLen;
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut);
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  };
  if (content instanceof EmbedBuilder) {
    const desc = content.data.description || '';
    const chunks = splitText(desc, MAX_EMBED_DESC);
    for (let i = 0; i < chunks.length; i++) {
      const e = EmbedBuilder.from(content)
        .setDescription(chunks[i])
        .setTitle(i === 0 ? content.data.title : `${content.data.title || 'Embed'} (part ${i + 1})`);
      try {
        sentMsgs.push(await channel.send({ embeds: [e] }));
      } catch (err) {
        console.error(`[sendChunks] Failed to send embed part ${i + 1}:`, err.message);
      }
    }
    return sentMsgs;
  }
  if (typeof content === 'string') {
    const chunks = splitText(content, MAX_MESSAGE_LEN);
    for (let i = 0; i < chunks.length; i++) {
      try {
        if (isEmbed) {
          const e = new EmbedBuilder()
            .setDescription(chunks[i])
            .setColor('#2f3136')
            .setTitle(i === 0 ? 'Message' : `Message (part ${i + 1})`);
          sentMsgs.push(await channel.send({ embeds: [e] }));
        } else {
          sentMsgs.push(await channel.send(chunks[i]));
        }
      } catch (err) {
        console.error(`[sendChunks] Failed to send text part ${i + 1}:`, err.message);
      }
    }
  }
  return sentMsgs;
};
export const commandAttachment = async (buffer, name = 'file.png', type = 'image/png') => {
  if (!buffer) throw new Error('commandAttachment: missing buffer');
  return new AttachmentBuilder(buffer, { name, contentType: type });
};
export const commandShopComponent = async ({
  title = "Shop",
  info = "",
  color = "#2f3136",
  items = [],
  perPage = 5,
  userId = null,
  user = null,
  bot = null,
  message = null,
  globalOptions = {
    autoRestock: true,
    defaultRestockTime: 300000,
    notificationsEnabled: true,
    globalLimit: { enabled: false, daily: 0, weekly: 0, monthly: 0, yearly: 0 },
  },
} = {}) => {
  if (!userId || !user || !message) throw new Error("commandShopComponent: userId, user, bot, and message are required");
  let mode = "shop";
  let currentPage = 0;
  const cart = {};
  let selectedItem = null;
  let notification = "";
  const totalPages = Math.ceil(items.length / perPage);
  const getPagedItems = () => items.slice(currentPage * perPage, currentPage * perPage + perPage);
  const applyDiscount = (item, priceObj) => {
    const sale = item.options?.sales?.item;
    if (sale?.active && (!sale.startTime || Date.now() >= sale.startTime) && (!sale.endTime || Date.now() <= sale.endTime)) {
      const discounted = {};
      for (const cur in priceObj) discounted[cur] = Math.floor(priceObj[cur] * (1 - sale.discount / 100));
      return discounted;
    }
    return priceObj;
  };
  const canBuy = async (item, qty) => {
    const userQty = await getUserStock(userId, item.id);
    const globalQty = await getGlobalStock(item.id);
    if (item.options?.stock?.userStock?.enabled && userQty < qty) return [false, `You don't have enough personal stock for ${item.name}.`];
    if (item.options?.stock?.globalStock?.enabled && globalQty < qty) return [false, `Not enough global stock for ${item.name}.`];
    return [true];
  };
  const build = async () => {
    const embed = new EmbedBuilder()
      .setTitle(mode === "shop" ? `${title} Shop` : "Cart")
      .setThumbnail(config.BotAvatarURL)
      .setColor(color)
      .setFooter({ text: mode === "shop" ? `Page ${currentPage + 1}/${totalPages} • User: ${user}` : `User: ${user}`, iconURL: config.BotAvatarURL });
    let description = "";
    if (mode === "shop") {
      description = `**Info:** ${info}\nNext restock ${getNextGlobalRestock()}\n<----------------->`;
      for (const item of getPagedItems()) {
        if (item.options?.ui?.showInShop === false) continue;
        let priceObj = typeof item.price === "function" ? await item.price() : item.price || {};
        priceObj = applyDiscount(item, priceObj);
        const priceStr = Object.entries(priceObj).map(([cur, amt]) => `${amt} ${cur}`).join(", ");
        const userQty = await getUserStock(userId, item.id);
        const globalQty = await getGlobalStock(item.id);
        const stockStr = `Stock: Global: ${globalQty ?? "∞"} | Yours: ${userQty ?? "∞"}`;
        description += `\n**\`${item.name} ${item.emoji || ""}\`** - \`${priceStr}\` - \`${item.desc}\` - ${stockStr}`;
      }
      description += "<----------------->\n";
    } else {
      description = "🛒 **Current cart items:**\n";
      for (const [name, qty] of Object.entries(cart)) {
        const item = items.find(i => i.name === name);
        if (item.options?.ui?.showInCart === false) continue;
        description += `- \`${name} ${item?.emoji || ""}\` x \`${qty}\`\n`;
      }
    }
    if (notification.length && globalOptions.notificationsEnabled) description += `\n📃 **Notifications:**\n${notification}`;
    embed.setDescription(description);
    const components = [];
    if (mode === "shop") {
      const prevBtn = {
        label: "⬅️ Prev",
        style: 2,
        customId: `shop_prev_${crypto.randomUUID()}`,
        onClick: async int => {
          if (int.user.id !== userId) return;
          currentPage = (currentPage - 1 + totalPages) % totalPages;
          await int.update(await build());
        },
      };
      const pageBtn = { label: `Page ${currentPage + 1} / ${totalPages}`, style: 2, customId: `shop_page_${crypto.randomUUID()}`, disabled: true };
      const nextBtn = {
        label: "➡️ Next",
        style: 2,
        customId: `shop_next_${crypto.randomUUID()}`,
        onClick: async int => {
          if (int.user.id !== userId) return;
          currentPage = (currentPage + 1) % totalPages;
          await int.update(await build());
        },
      };
      const paginationRows = await commandButtonComponent([prevBtn, pageBtn, nextBtn]);
      if (paginationRows.length) components.push(...paginationRows);
      const selectOptions = getPagedItems()
        .filter(i => i.options?.ui?.showInShop !== false)
        .map(item => ({ label: item.name.slice(0, 100), value: item.name, description: item.desc.slice(0, 100), emoji: item.emoji }));
      const selectRows = await commandSelectComponent({
        placeholder: "Select an item",
        options: selectOptions,
        onSelect: async int => {
          if (int.user.id !== userId) return;
          selectedItem = int.values[0];
          await int.update(await build());
        },
      });
      if (selectRows.length) components.push(...selectRows);
      if (selectedItem) {
        const item = items.find(i => i.name === selectedItem);
        const buyBtns = [];
        if (item.options?.features?.allowBulkBuy !== false && item.options?.ui?.showBuyButtons !== false) {
          const createBuyBtn = (label, qty, emoji) => ({
            label,
            emoji,
            style: 1,
            customId: `shop_buy${qty}_${crypto.randomUUID()}`,
            onClick: async int => {
              if (int.user.id !== userId) return;
              const [ok, msg] = await canBuy(item, qty);
              if (!ok) {
                notification += `\n❌ ${msg}`;
                await int.update(await build());
                return;
              }
              cart[selectedItem] = (cart[selectedItem] || 0) + qty;
              notification += `\n- **Added** \`${qty} x ${selectedItem}\` to cart.`;
              await int.update(await build());
            },
          });
          buyBtns.push(createBuyBtn("Buy 1", 1, "1️⃣"));
          buyBtns.push(createBuyBtn("Buy 5", 5, "5️⃣"));
          buyBtns.push(createBuyBtn("Buy 10", 10, "🔟"));
        }
        if (item.options?.features?.allowCustomQty && item.options?.ui?.showBuyButtons !== false) {
          const customBtn = {
            label: "Custom Quantity",
            emoji: "✏️",
            style: 2,
            customId: `shop_custom_${crypto.randomUUID()}`,
            onClick: async int => {
              if (int.user.id !== userId) return;
              const modal = await commandModal({
                title: "Custom Quantity",
                customId: `shop_modal_${crypto.randomUUID()}`,
                inputs: [{ customId: "quantity", label: "Quantity", style: TextInputStyle.Short, required: true, minLength: 1, maxLength: 10, placeholder: "Enter quantity" }],
                onSubmit: async int2 => {
                  if (int2.user.id !== userId) return;
                  const qty = parseInt(int2.fields.getTextInputValue("quantity"));
                  if (isNaN(qty) || qty < 1) {
                    notification += "\n❌ Invalid quantity.";
                    await int2.update(await build());
                    return;
                  }
                  const [ok, msg] = await canBuy(item, qty);
                  if (!ok) {
                    notification += `\n❌ ${msg}`;
                    await int2.update(await build());
                    return;
                  }
                  cart[selectedItem] = (cart[selectedItem] || 0) + qty;
                  notification += `\n- **Added** \`${qty} x ${selectedItem}\` to cart.`;
                  await int2.update(await build());
                },
              });
              await int.showModal(modal);
            },
          };
          buyBtns.push(customBtn);
        }
        const viewCartBtn = { label: "View Cart", emoji: "🛍️", style: 2, customId: `shop_viewcart_${crypto.randomUUID()}`, onClick: async int => { if (int.user.id !== userId) return; mode = "cart"; await int.update(await build()); } };
        buyBtns.push(viewCartBtn);
        const buyRows = await commandButtonComponent(buyBtns);
        if (buyRows.length) components.push(...buyRows);
      }
    } else {
      const checkoutBtn = {
        label: 'Checkout',
        emoji: '✅',
        style: ButtonStyle.Success,
        customId: `cart_checkout_${crypto.randomUUID()}`,
        onClick: async int => {
          if (int.user.id !== userId) return;
          if (!Object.keys(cart).length) {
            notification += '\n❔ Cart is empty.';
            await int.update(await build());
            return;
          }
          const cartItemsStr = Object.entries(cart)
            .map(([name, qty]) => {
              const item = items.find(i => i.name === name);
              return `- ${name} ${item?.emoji || ''} x ${qty}`;
            })
            .join('\n');
          const confirmEmbed = new EmbedBuilder()
            .setTitle('Confirm Purchase 🛒')
            .setDescription(`You are about to purchase:\n${cartItemsStr}\n**⚠️ NOTE:** This action is irreversible.`)
            .setFooter({ text: `User: ${user}` });
          const confirmRow = await commandConfirmationButton(bot, message, 'Confirm purchase?', 60000);
          await message.edit({ embeds: [confirmEmbed], components: [confirmRow] });
          bot.once('commandConfirmation', async (confirmed, int2) => {
            if (confirmed) {
              for (const [name, qty] of Object.entries(cart)) {
                const item = items.find(i => i.name === name);
                const [ok, msg] = await canBuy(name, userId, qty);
                if (!ok) {
                  notification += `\n❌ ${msg}`;
                  continue;
                }
                if (item.onBuy) {
                  const success = await item.onBuy({ userId, qty });
                  if (success) {
                    if (item.options?.stock?.enabled) item.options.stock.quantity -= qty;
                    notification += `\n- Purchased ${qty} x ${name}.`;
                  } else notification += `\n❌ Failed to purchase ${qty} x ${name}.`;
                }
              }
              Object.keys(cart).forEach(k => delete cart[k]);
            } else if (confirmed === false) notification += '\n❌ Purchase cancelled.';
            else notification += '\n⌛ Purchase timed out.';
            mode = 'shop';
            await message.edit(await build());
          });
        },
      };
      const cancelCartBtn = {
        label: 'Cancel Cart',
        emoji: '❌',
        style: ButtonStyle.Danger,
        customId: `cart_cancel_${crypto.randomUUID()}`,
        onClick: async int => {
          if (int.user.id !== userId) return;
          if (!Object.keys(cart).length) return;
          Object.keys(cart).forEach(k => delete cart[k]);
          notification += '\n❌ Cart cancelled.';
          mode = 'shop';
          await int.update(await build());
        },
      };
      const backBtn = {
        label: 'Back to Shop',
        emoji: '⬅️',
        style: ButtonStyle.Secondary,
        customId: `cart_back_${crypto.randomUUID()}`,
        onClick: async int => {
          if (int.user.id !== userId) return;
          mode = 'shop';
          await int.update(await build());
        },
      };
      const cartRows = await commandButtonComponent([checkoutBtn, cancelCartBtn, backBtn]);
      if (cartRows.length) components.push(...cartRows);
    }
    return { embeds: [embed], components };
  };
  return await build();
};