import { getAllShopItems } from "../../utils/shop.js";

export default {
  name: "shop",
  description: "Open the shop.",
  usage: "",
  aliases: [],
  category: "economy",
  perm: 0,
  cooldown: 5,
  globalCooldown: 0,
  id: 73,
  dependencies: `commandShopComponent config 
                 formatTime log thisFile giveItem`,
  execute: async (message, args, user, command, dep) => {
    try {
      const shopData = getAllShopItems();

      const shopItems = shopData.map(shopItem => {
        return {
          id: shopItem.id,
          name: shopItem.item.name,
          emoji: shopItem.item.emoji,
          desc: shopItem.item.desc,
          category: shopItem.category,
          price: async () => ({ dredcoin: shopItem.item.price }),
          onBuy: async ({ userId, qty }) => {
            await dep.giveItem(userId, shopItem.item.name, qty);
          },
        };
      });
      const result = await dep.commandShopComponent({
        title: "Test Shop",
        info: "Welcome! Buy your items below.",
        color: "#33FFAA",
        items: shopItems,
        message,
        perPage: 3,
        userId: message.author.id,
        user,
        bot: dep.config.bot,
      });

      return await message.reply({
        embeds: result.embeds,
        components: result.components
      });

    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err.stack || err}`, "error");
      return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
    }
  }
};