export default {
  name: "changeclansetting",
  description: "Change a clan's setting (owner/admin only).",
  aliases: ["setclan"],
  usage: "<setting> <value>",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 27,
  dependencies: `changeClanSetting getUserClan 
                 commandEmbed config isAuthorized commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    const setting = args[0].toLowerCase();
    const value = args.slice(1).join(" ");
    const clanId = (await dep.getUserClan(user)).clan;
    const allowed = dep.isAuthorized(user, clanId);
    const result = await dep.changeClanSetting(user, clanId, setting, value);
    const success = result.updated && allowed;
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: success
        ? `✅ Setting \`${setting}\` updated to: \`${value}\``
        : result.error || "❌ Failed to update setting.",
      color: success ? "#00FF00" : "#FF0000",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Change Another Setting",
        customId: `${command}_useagain_${user}`,
        style: 1,
        emoji: "🔁",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Change Clan Setting",
            customId: `${command}_modal_${user}`,
            inputs: [
              { label: "Setting", customId: `${command}_setting_${user}`, style: 1 },
              { label: "Value", customId: `${command}_value_${user}`, style: 1 }
            ],
            onSubmit: async (mi) => {
              const newSetting = mi.fields.getTextInputValue(`${command}_setting_${user}`).toLowerCase();
              const newValue = mi.fields.getTextInputValue(`${command}_value_${user}`);
              const clan = (await dep.getUserClan(user)).clan;
              const allowed = dep.isAuthorized(user, clan);
              const r = await dep.changeClanSetting(user, clan, newSetting, newValue);
              if (!r.updated || !allowed) {
                return mi.reply({ content: r.error || "❌ Failed to update setting.", ephemeral: true });
              }
              return mi.reply({ content: `✅ Setting \`${newSetting}\` updated to: \`${newValue}\`.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};