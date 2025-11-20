export default {
  name: "setdisplayname",
  description: "Set your account display name.",
  aliases: ["setname", "displayname"],
  usage: "<newName>",
  category: "account",
  perm: 0,
  cooldown: 0,
  globalCooldown: 86400,
  id: 51,
  dependencies: `loadData saveData commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    const newName = args[0];
    let description = "";
    if (!newName) return message.react("❌");
    else {
      const data = await dep.loadData(user);
      if (!data?.account) return message.react("❌");
      else {
        const oldName = data.account.displayName || data.account.name || "Unknown";
        data.account.displayName = newName;
        await dep.saveData(user, data);
        description = `✅ Display name changed from **${oldName}** to **${newName}**.`;
        try { await message.member.setNickname(newName); } catch {}
      }
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description,
      color: description.startsWith("✅") ? "#00FF00" : "#FF0000",
      user,
      reward: false,
      message,
    });
    try { await message.author.send({ embeds: [embed] });
    } catch {}
  }
};