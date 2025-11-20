export default {
  name: "dbset",
  description: "Set a value in a user's data.",
  aliases: [],
  usage: "<user> <path> <value>",
  category: "moderation",
  perm: 4,
  cooldown: 0,
  globalCooldown: 0,
  id: 70,
  dependencies: "saveData loadData commandEmbed commandButtonComponent config",
  execute: async (message, args, user, command, dep) => {
    const [userId, path, ...valueParts] = args;
    const valueStr = valueParts.join(" ");
    let value;
    if (valueStr === "true") value = true;
    else if (valueStr === "false") value = false;
    else if (!isNaN(Number(valueStr))) value = Number(valueStr);
    else value = valueStr;
    const data = await dep.loadData(userId);
    const keys = path.split(".");
    let obj = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof obj[keys[i]] !== "object" || obj[keys[i]] === null) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    await dep.saveData(userId, data);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${args.join(" ")}`,
      description: `✅ Set \`${path}\` to \`${value}\` for user \`${userId}\`.`,
      color: "#00FF00",
      user,
      reward: false,
      message
    });
    const buttons = await dep.commandButtonComponent([
      {
        label: "🔁 Set Again",
        style: 2,
        onClick: async (interaction) => {
          if (interaction.user.id !== message.author.id) return;
          try {
            const newData = await dep.loadData(userId);
            let tempObj = newData;
            for (let i = 0; i < keys.length - 1; i++) {
              if (typeof tempObj[keys[i]] !== "object" || tempObj[keys[i]] === null) tempObj[keys[i]] = {};
              tempObj = tempObj[keys[i]];
            }
            tempObj[keys[keys.length - 1]] = value;
            await dep.saveData(userId, newData);
            await interaction.update({ embeds: [embed] });
          } catch (err) {
            await interaction.reply({ content: `❌ Error: \`${err.message}\``, ephemeral: true });
          }
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: buttons });
  }
};