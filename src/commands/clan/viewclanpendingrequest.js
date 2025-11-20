export default {
  name: "viewpendingclan",
  description: "View and manage pending join requests for your clan.",
  aliases: ["clanpending", "clpd"],
  usage: "",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 26,
  dependencies: `viewPendingClanRequests approveJoinRequest 
                 denyJoinRequest getUserClan
                 commandEmbed commandButtonComponent 
                 commandSelectComponent config`,
  execute: async (message, args, user, command, dep) => {
    const clanId = (await dep.getUserClan(user)).clan;
    let result = dep.viewPendingClanRequests(user, clanId);
    if (!result.success || !result.users.length) {
      return message.reply({ embeds: [await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: result.error || "No pending requests... (what a lonely clan)",
        color: "#FF0000",
        user,
        reward: false,
        message
      })] });
    }
    let users = result.users;
    const perPage = 5;
    let page = 0;
    let selectedUser = null;
    const getPageEmbed = async () => {
      const start = page * perPage;
      const slice = users.slice(start, start + perPage);
      const content = slice.map(u => `• User: \`${u}\``).join("\n") || "No pending users on this page.";
      return await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} - Pending Requests - ${result.clan} [${page + 1}/${Math.ceil(users.length / perPage)}]`,
        description: content,
        color: "#00BFFF",
        user,
        reward: false,
        message
      });
    };
    const getSelectRow = async () => {
      const start = page * perPage;
      const slice = users.slice(start, start + perPage).filter(u => typeof u === "string" && u.length >= 3 && u.length <= 100);
      if (!slice.length) return [];
      return await dep.commandSelectComponent({
        placeholder: "Select a user",
        options: slice.slice(0, 25).map(u => ({
          label: `User ${u.slice(0, 25)}`,
          description: u.slice(0, 100),
          value: u.slice(0, 100),
          default: u === selectedUser
        })),
        onSelect: async (interaction, values) => {
          if (interaction.user.id !== message.author.id) return interaction.reply({ content: "❌ **Not yours** command.", ephemeral: true });
          selectedUser = values[0];
          await interaction.reply({ content: `**Selected \`${selectedUser}\`**`, ephemeral: true });
        }
      });
    };
    const getButtonRows = async () => {
      return await dep.commandButtonComponent([
        [
          {
            label: "Approve",
            customId: `${command}_approve_${user}`,
            style: 3,
            emoji: "✅",
            onClick: async (btn) => {
              if (btn.user.id !== message.author.id) return;
              if (!selectedUser) return btn.reply({ content: "❌ **No user** selected.", ephemeral: true });
              dep.approveJoinRequest(user, clanId, selectedUser);
              users.splice(users.indexOf(selectedUser), 1);
              selectedUser = null;
              await btn.update({ embeds: [await getPageEmbed()], components: [...await getSelectRow(), ...await getButtonRows()] });
            }
          },
          {
            label: "Deny",
            customId: `${command}_deny_${user}`,
            style: 4,
            emoji: "❌",
            onClick: async (btn) => {
              if (btn.user.id !== message.author.id) return;
              if (!selectedUser) return btn.reply({ content: "❌ **No user** selected.", ephemeral: true });
              dep.denyJoinRequest(user, clanId, selectedUser);
              users.splice(users.indexOf(selectedUser), 1);
              selectedUser = null;
              await btn.update({ embeds: [await getPageEmbed()], components: [...await getSelectRow(), ...await getButtonRows()] });
            }
          },
          {
            label: "⬅️",
            customId: `${command}_previous_${user}`,
            style: 2,
            disabled: page === 0,
            onClick: async (btn) => {
              if (btn.user.id !== message.author.id) return btn.reply({ content: "❌ **Not allowed**.", ephemeral: true });
              page = Math.max(0, page - 1);
              selectedUser = null;
              await btn.update({ embeds: [await getPageEmbed()], components: [...await getSelectRow(), ...await getButtonRows()] });
            }
          },
          {
            label: "➡️",
            customId: `${command}_next_${user}`,
            style: 2,
            disabled: (page + 1) * perPage >= users.length,
            onClick: async (btn) => {
              if (btn.user.id !== message.author.id) return btn.reply({ content: "❌ Not allowed.", ephemeral: true });
              page = Math.min(Math.floor(users.length / perPage), page + 1);
              selectedUser = null;
              await btn.update({ embeds: [await getPageEmbed()], components: [...await getSelectRow(), ...await getButtonRows()] });
            }
          },
          {
            label: "Refresh",
            customId: `${command}_refresh_${user}`,
            style: 1,
            emoji: "🔄",
            onClick: async (btn) => {
              if (btn.user.id !== message.author.id) return btn.reply({ content: "❌ Not allowed.", ephemeral: true });
              result = dep.viewPendingClanRequests(user, clanId);
              users = result.users;
              page = 0;
              selectedUser = null;
              await btn.update({ embeds: [await getPageEmbed()], components: [...await getSelectRow(), ...await getButtonRows()] });
            }
          }
        ]
      ]);
    };
    return message.reply({
      embeds: [await getPageEmbed()],
      components: [...await getSelectRow(), ...await getButtonRows()]
    });
  }
};