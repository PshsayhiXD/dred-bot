export default {
  name: "resetcookie",
  description: "Clear your account cookie.",
  aliases: ["clearcookie"],
  usage: "",
  category: "account",
  perm: 0,
  cooldown: 1,
  globalCooldown: 1,
  id: 53,
  dependencies: `loadData saveData commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    let description = "";
    const data = await dep.loadData(user);
    if (!data?.account) return message.react("❌");
    else if (!data.account.token) return message.react("⚠️");
    else {
      delete data.account.token;
      await dep.saveData(user, data);
      description = "✅ Your session token has been cleared. You will need to log in again to use your account on the dashboard.";
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