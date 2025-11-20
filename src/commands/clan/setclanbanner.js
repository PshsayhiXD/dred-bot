import path from "path";
export default {
  name: "setclanbanner",
  description: "Set your clan banner image.",
  aliases: ["clbann"],
  usage: "[image]",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 22,
  dependencies: `setClanBanner convertToBase64 commandEmbed commandButtonComponent commandModal config`,
  execute: async (message, args, user, command, dep) => {
    const attachment = message.attachments?.first?.();
    if (!attachment) return message.react("❌");
    const { base64, error } = await dep.convertToBase64(attachment.url);
    if (!base64) return message.reply(error || "❌ Failed to process the image.");
    const result = await dep.setClanBanner(user, null, base64);
    const filePath = result?.bannerPath;
    if (result.NSFW && message.deleteable) message.delete();
    if (result.warn) return await message.reply({ embeds: [await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: result.warn + (result.NSFW ? " Sending more NSFW can get you banned." : ""),
      color: "#FF0",
      user,
      reward: false,
      message
    })] });
    if (!result.updated) return message.react("❌");
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `Banner saved to \`${path.basename(filePath)}\``,
      image: filePath ? `attachment://${path.basename(filePath)}` : null,
      color: "#00FF00",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Change Again",
        customId: `${command}_useagain_${user}`,
        style: 1,
        emoji: "🔁",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Change Clan Banner",
            customId: `${command}_modal_${user}`,
            inputs: [
              { label: "Image URL", customId: `${command}_url_${user}`, style: 1 }
            ],
            onSubmit: async (mi) => {
              const url = mi.fields.getTextInputValue(`${command}_url_${user}`);
              const { base64, error } = await dep.convertToBase64(url);
              if (!base64) return mi.reply({ content: error || "❌ Failed to process the image.", ephemeral: true });
              const r = await dep.setClanBanner(user, null, base64);
              if (!r.updated) return mi.reply({ content: "❌ Failed to update banner.", ephemeral: true });
              const fPath = r.bannerPath;
              const e = await dep.commandEmbed({
                title: `${dep.config.PREFIX}${command}`,
                description: `✅ Banner updated to \`${path.basename(fPath)}\``,
                image: fPath ? `attachment://${path.basename(fPath)}` : null,
                color: "#00FF00",
                user,
                reward: false,
                message
              });
              return mi.reply({
                embeds: [e],
                files: fPath ? [{ attachment: fPath, name: path.basename(fPath) }] : [],
                ephemeral: true
              });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({
      embeds: [embed],
      components: rows,
      files: filePath ? [{ attachment: filePath, name: path.basename(filePath) }] : []
    });
  }
};