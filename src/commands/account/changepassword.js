export default {
  name: "changepassword",
  description: "Change your account password.",
  aliases: ["newpass"],
  usage: "",
  category: "account",
  perm: 0,
  cooldown: 1,
  globalCooldown: 3600,
  id: 52,
  dependencies: `loadData saveData commandEmbed config 
                 commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    const data = await dep.loadData(user);
    if (!data?.account) return message.react("❌");
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: "Click below to set a new password.",
      color: "#00AAFF",
      user,
      reward: false,
      message
    });
    const buttons = await dep.commandButtonComponent([{
      label: "Change Password",
      style: 1,
      emoji: "🔑",
      onClick: async (btn) => {
        if (btn.user.id !== message.author.id) return btn.reply({ content: "❌ Not your button.", ephemeral: true });
        const modal = await dep.commandModal({
          title: "Change Password",
          inputs: [{
            label: "New Password",
            placeholder: "Enter your new password",
            style: 1,
            minLength: 6,
            maxLength: 32
          }],
          onSubmit: async (interaction) => {
            const newPass = interaction.fields.fields.first().value;
            data.account.password = newPass;
            await dep.saveData(user, data);
            const passEmbed = await dep.commandEmbed({
              title: `${dep.config.PREFIX}${command}`,
              description: `✅ **Your password has been changed to**: ||${newPass}||`,
              color: "#00FF00",
              user,
              reward: false,
              message
            });
            try { await interaction.user.send({ embeds: [passEmbed] }); } catch {}
            await interaction.reply({ content: "✅ Password updated.", ephemeral: true });
          }
        });
        await btn.showModal(modal);
      }
    }]);
    message.author.send({ embeds: [embed], components: buttons }).catch(() => {});
  }
};
