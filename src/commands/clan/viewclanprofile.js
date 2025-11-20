export default {
  name: "viewclanprofile",
  description: "View details about a clan.",
  aliases: ["clanprofile", "claninfo"],
  usage: "[clan]",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 32,
  dependencies: `getClan getClanMemberCount drawClanCard 
                 getClanRequestCount getUserClan commandButtonComponent`,
  execute: async (message, args, user, command, dep) => {
    const input = args[0] || (await dep.getUserClan(user))?.clan?.id;
    if (!input) return;
    const clan = await dep.getClan(input);
    if (!clan) return message.react("❌");
    const getCard = async () => {
      const memberCount = dep.getClanMemberCount(clan.id);
      const requestCount = dep.getClanRequestCount(clan.id);
      return await dep.drawClanCard({
        ...clan,
        memberCount,
        requestCount
      });
    };
    const getButtons = async () => {
      return await dep.commandButtonComponent([
        [
          {
            label: "Refresh",
            customId: `${command}_useagain_${user}`,
            style: 1,
            emoji: "🔄",
            onClick: async (btn) => {
              if (btn.user.id !== message.author.id) return btn.reply({ content: "❌ Not yours.", ephemeral: true });
              const buffer = await getCard();
              await btn.update({
                files: [{ attachment: buffer, name: `clan_${clan.id}.png` }],
                components: await getButtons()
              });
            }
          }
        ]
      ]);
    };
    const buffer = await getCard();
    return message.reply({
      files: [{ attachment: buffer, name: `clan_${clan.id}.png` }],
      components: await getButtons()
    });
  }
};