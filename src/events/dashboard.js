import { EmbedBuilder } from "discord.js";
import { helper } from "../utils/helper.js";
import config from "../config.js";
import log from "../utils/logger.js";
import { commandLinkButton } from "../utils/commandComponent.js";
import thisFile from "../utils/thisFile.js";
const NGROK = await helper.getNgrokUrl();
export const sendDashboardEmbed = async client => {
  try {
    const channel = await client.channels.fetch(config.dashboardChannelID);
    if (!channel) throw new Error(`[-] ${thisFile(import.meta.url)}: Dashboard channel not found!`);
    const embed = new EmbedBuilder()
      .setTitle("Dashboard")
      .setDescription(`**🔗 [Click to Open Dashboard](${NGROK})**\nOr copy this link:\`\`\`${NGROK}\`\`\``)
      .setColor(0xffa500)
      .addFields(
        {
          name: "📄 Legal",
          value: `[Privacy Policy](${NGROK}/privacy) • [Terms of Service](${NGROK}/terms)`,
          inline: false
        },
        {
          name: "Security Notice",
          value: "Never log in with accounts you do not own. Moderators will **not** assist with stolen tokens or IP stolen.",
          inline: false
        }
      )
      .setFooter({
        text: "⚠️⚠️⚠️ DO NOT LOG IN WITH ACCOUNTS YOU DON'T OWN. YOU ARE RESPONSIBLE FOR YOUR OWN SAFETY. ⚠️⚠️⚠️"
      })
      .setTimestamp();
    const components = await commandLinkButton("🌐 Open Dashboard", NGROK);
    const messages = await channel.messages.fetch({ limit: 10 });
    const prevMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length);
    if (prevMsg) await prevMsg.edit({ embeds: [embed], components });
    else await channel.send({ embeds: [embed], components });
  } catch (err) {
    log(`[${thisFile(import.meta.url)}] Failed to send dashboard embed: ${err}`, "error");
  }
  log(`[${thisFile(import.meta.url)}] registered.`, "success");
};