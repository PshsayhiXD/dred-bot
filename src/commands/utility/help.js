import {
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder, TextInputStyle,
  ActionRowBuilder
} from "discord.js";

export default {
  name: "help",
  description: "Show help for a command, category, or type.",
  aliases: ["h"],
  usage: "[type/category/command] [nameOrId]",
  category: "utility",
  perm: 0,
  cooldown: 2,
  globalCooldown: 2,
  id: 33,
  dependencies: `commandEmbed commandButtonComponent config 
                 getCommandByName getCommandById getCommandByCategory 
                 getAllCommand Permission formatTime isRankBetter`,
  execute: async (message, args, user, command, dep) => {
    const [first, ...rest] = args;
    const bot = message.client;
    const input = first?.toLowerCase();
    const userPerm = await dep.Permission(user, "get", "max");
    const getFullCmdList = () => {
      return Object.entries(dep.getAllCommand(bot)).map(([id]) =>
        dep.getCommandById(bot, Number(id))
      );
    };
    const tryShowCommand = async cmd => {
      if (!cmd) return;
      const fields = [];
      if (cmd.usage) fields.push({ name: "Usage", value: `\`${dep.config.PREFIX}${cmd.name} ${cmd.usage}\`` });
      if (cmd.description) fields.push({ name: "Description", value: cmd.description });
      if (cmd.category) fields.push({ name: "🗂️ Category", value: cmd.category });
      if (cmd.cooldown != null) fields.push({ name: "⏱️ Cooldown", value: `${cmd.cooldown}s` });
      if (cmd.globalCooldown != null) fields.push({ name: "⏱️ Global Cooldown", value: `${cmd.globalCooldown}s` });
      if (cmd.perm != null) fields.push({ name: "Permission", value: String(cmd.perm) });
      if (Array.isArray(cmd.aliases) && cmd.aliases.length) fields.push({ name: "Aliases", value: cmd.aliases.map(a => `\`${a}\``).join(", ") });
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${cmd.name}`,
        description: `ID: \`${cmd.id}\``,
        color: '#00FF00',
        fields,
        user,
        reward: false,
        message
      });
      return message.reply({ embeds: [embed] });
    };
    const tryShowSpecialType = async (type, idOrName) => {
      try {
        const typeName = type.endsWith("s") ? type.slice(0, -1) : type;
        const mod = await import(`../../utils/${type}/index.js`);
        const fnName = `get${typeName.charAt(0).toUpperCase() + typeName.slice(1)}Metadata`;
        const fn = mod[fnName];
        if (typeof fn !== "function") throw new Error(`Missing ${fnName}()`);
        const data = await fn(idOrName || rest.join(" "));
        if (!data) return message.reply(`❌ No ${typeName} found.`);
        const fields = Object.entries(data).filter(([k, v]) => k !== "execute" && typeof v !== "function")
          .map(([k, v]) => ({
            name: k,
            value: typeof v === "object" && v !== null ? "`\n" + JSON.stringify(v, null, 2) + "\n`" : String(v)
          })).concat(Object.entries(data).filter(([k, v]) => typeof v === "function" && k !== "execute").map(([k]) => ({ name: k, value: "(func)" })));
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${typeName} ${idOrName}`,
          description: `Found result for \`${idOrName || rest.join(" ")}\``,
          color: '#00FF00',
          fields,
          user,
          reward: false,
          message
        });
        return message.reply({ embeds: [embed] });
      } catch (err) {
        return message.reply(`❌ **FAILED** to load \`${type}\`: ${err.message}`);
      }
    };
    const showPaginatedList = async cmdList => {
      const perPage = dep.config.HELP_MAX_COMMAND_PERPAGE || 10;
      const pages = Math.ceil(cmdList.length / perPage);
      let page = 0;
      const buildEmbed = async () => {
        const slice = cmdList.slice(page * perPage, page * perPage + perPage);
        const lines = await Promise.all(slice.map(async c => {
          const blocked = await dep.isRankBetter(c.perm, userPerm) ? "❌ " : "";
          let desc = c.description || "No description";
          if (desc.endsWith(".")) desc = desc.slice(0, -1);
          const cooldownPart = c.cooldown != null || c.globalCooldown != null ? ` • ⏱️ **${await dep.formatTime(c.cooldown * 1000)}**|**${await dep.formatTime(c.globalCooldown * 1000)}**` : "";
          return `${blocked} \`${c.name} ${c.usage || ""}\` • ${desc}${cooldownPart}`;
        }));
        const description = lines.join("\n") || "No commands found.";
        return dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description,
          color: '#00FF00',
          user,
          reward: false,
          message
        });
      };
      const buildButtons = async () => {
        return dep.commandButtonComponent([
          {
            label: "⏪",
            style: ButtonStyle.Secondary,
            disabled: page === 0,
            onClick: async i => {
              if (i.user.id !== message.author.id) return i.reply({ content: "❌ Not yours.", ephemeral: true });
              page--;
              const embed = await buildEmbed();
              await i.update({ embeds: [embed], components: await buildButtons() });
            }
          },
          {
            label: `${page + 1}/${pages}`,
            style: ButtonStyle.Primary,
            onClick: async i => {
              if (i.user.id !== message.author.id) return i.reply({ content: "❌ Not yours.", ephemeral: true });
              const modal = new ModalBuilder()
                .setCustomId("help_search")
                .setTitle("Search Command")
                .addComponents(
                  new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                      .setCustomId("query")
                      .setLabel("Enter name or ID")
                      .setStyle(TextInputStyle.Short)
                      .setRequired(true)
                  )
                );
              await i.showModal(modal);
              const submitted = await i.awaitModalSubmit({ time: 15000 }).catch(() => null);
              if (!submitted) return;
              const val = submitted.fields.getTextInputValue("query");
              const found = dep.getCommandByName(bot, val) || dep.getCommandById(bot, Number(val));
              if (!found) return submitted.reply({ content: "❌ Not found.", ephemeral: true });
              const fields = [];
              if (found.usage) fields.push({ name: "Usage", value: `\`${dep.config.PREFIX}${found.name} ${found.usage}\`` });
              if (found.description) fields.push({ name: "Description", value: found.description });
              if (found.category) fields.push({ name: "🗂️ Category", value: found.category });
              if (found.cooldown != null) fields.push({ name: "⏱️ Cooldown", value: `${found.cooldown}s` });
              if (found.globalCooldown != null) fields.push({ name: "⏱️ Global Cooldown", value: `${found.globalCooldown}s` });
              if (found.perm != null) fields.push({ name: "Permission", value: String(found.perm) });
              if (Array.isArray(found.aliases) && found.aliases.length) fields.push({ name: "Aliases", value: found.aliases.map(a => `\`${a}\``).join(", ") });
              const embed = await dep.commandEmbed({
                title: `Help: ${found.name}`,
                description: `ID: \`${found.id}\``,
                fields,
                user,
                reward: false,
                message
              });
              return submitted.reply({ embeds: [embed], ephemeral: true });
            }
          },
          {
            label: "⏩",
            style: ButtonStyle.Secondary,
            disabled: page === pages - 1,
            onClick: async i => {
              if (i.user.id !== message.author.id) return i.reply({ content: "❌ Not yours.", ephemeral: true });
              page++;
              const embed = await buildEmbed();
              await i.update({ embeds: [embed], components: await buildButtons() });
            }
          }
        ]);
      };
      const embed = await buildEmbed();
      const buttons = await buildButtons();
      return message.reply({ embeds: [embed], components: buttons });
    };
    if (!input || input === "all") return showPaginatedList(getFullCmdList());
    const special = ["items", "researchs", "quests", "skills", "achievements", "crops"];
    if (special.includes(input)) return tryShowSpecialType(input, rest.join(" "));
    const cat = dep.getCommandByCategory(bot, input);
    if (Object.keys(cat).length) {
      const cmds = Object.keys(cat).map(id => dep.getCommandById(bot, Number(id)));
      return showPaginatedList(cmds);
    }
    const byName = dep.getCommandByName(bot, input);
    if (byName) return tryShowCommand(byName);
    const byId = dep.getCommandById(bot, Number(input));
    if (byId) return tryShowCommand(byId);
    return message.reply(`❌ Nothing found for \`${input}\``);
  }
};