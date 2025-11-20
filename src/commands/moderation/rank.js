export default {
  name: "rank",
  description: "Set, remove, or view a user's ranks.",
  usage: '<"get"/"set"/"remove"> <user> [rank]',
  category: "moderation",
  aliases: [],
  cooldown: 5,
  globalCooldown: 0,
  perm: 3,
  id: 34,
  dependencies: `Permission isRankBetter isRankEqual 
                 commandEmbed config 
                 loadData loadDataByAccountId loadUsernameByAccountId`,
  execute: async (message, args, user, command, dep) => {
    const [action, userArg, role] = args;
    const replyEmbed = async (desc, color = "#ff0000") => {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${args.join(" ")}`,
        description: desc,
        color,
        user,
        reward: false,
        message
      });
      return message.reply({ embeds: [embed] });
    };
    const getUserId = async (arg) => {
      const mentionMatch = arg.match(/^<@!?(\d+)>$/);
      if (mentionMatch) return mentionMatch[1];
      const userById = await message.client.users.fetch(arg).catch(() => null);
      if (userById) return userById.id;
      const idFromAccount = dep.loadUsernameByAccountId(arg);
      return idFromAccount;
    };
    const targetId = await getUserId(userArg);
    if (!targetId) return replyEmbed("❌ **Invalid user**.");
    const target = await message.client.users.fetch(targetId).catch(() => null);
    if (!target) return replyEmbed("❌ **Unable to fetch user**.");
    const isSelf = target.id === message.author.id;
    const authorPerm = await dep.Permission(user, "get", "max");
    const targetPerm = await dep.Permission(target.id, "get", "max");
    if (action === "get") {
      const targetRanks = await dep.Permission(target.id, "get");
      const description = targetRanks?.length ? `📋 <@${target.id}>'s ranks:\n\`\n${targetRanks}\n\`` : `ℹ️ <@${target.id}> has no ranks.`;
      return replyEmbed(description, "#00BFFF");
    }
    if (!role) return replyEmbed(`❌ You must **specify a rank** to **\`${action}\`**.`);
    if (isSelf) return replyEmbed("❌ **You can't modify your own ranks**.");
    if (dep.isRankBetter(targetPerm, authorPerm) || dep.isRankEqual(targetPerm, authorPerm)) return replyEmbed("❌ You can't modify users **with equal or higher rank**.");
    if (dep.isRankBetter(role, authorPerm) || dep.isRankEqual(role, authorPerm)) return replyEmbed("❌ You can't assign or remove **ranks equal to or higher than your own**.");
    const permissionAction = action === "set" ? "set" : "remove";
    const success = await dep.Permission(target.id, permissionAction, role);
    const msg = success ? `✅ **Successfully** **${action}** \`${role}\` ${action === "set" ? "to" : "from"} <@${target.id}>.` : `❌ **Failed** to **${action}** \`${role}\`.`;
    return replyEmbed(msg, success ? "#00FF00" : "#FF0000");
  }
};