import { helper } from "../utils/helper.js";
import { commandEmbed } from "../utils/commandComponent.js";
import config from "../config.js";
import log from "../utils/logger.js";

let scheduledTimeouts = [];

const setupPvpEvent = async (bot) => {
  const scheduleEvents = async () => {
    for (const t of scheduledTimeouts) clearTimeout(t);
    scheduledTimeouts = [];
    let events;
    try {
      events = await helper.pvpEvent("all");
    } catch (err) {
      return log(`[setupPvpEvent]: Failed to fetch PvP events: ${err}`, "error");
    }
    const now = Date.now();
    const upcoming = events
      .map(e => ({ date: new Date(e.date) }))
      .filter(e => e.date.getTime() > now);
    const channel = bot.channels.cache.get(config.PvpEventChannelID);
    if (!channel?.isTextBased?.()) return log("[setupPvpEvent]: Invalid PvP channel.", "warn");
    for (const { date } of upcoming) {
      const startTime = date.getTime();
      const pingTime = startTime - 30 * 60 * 1000 - now;
      if (pingTime <= 0) continue;
      const t = setTimeout(async () => {
        try {
          const unix = Math.floor(startTime / 1000);
          const embed = await commandEmbed({
            title: "PvP Event Starting Soon",
            description: `A PvP event is starting <t:${unix}:R>!\nStart time: <t:${unix}:F>`,
            color: 0xff5555,
            timestamp: true,
          });
          const pingMessage = await channel.send({
            content: `<@&${config.PvpEventPingRoleID}>`,
            embeds: [embed],
          });
          const deleteTimeout = setTimeout(() => {
            pingMessage.delete().catch(err => {
              log(`[setupPvpEvent]: Failed to delete ping message: ${err.message}`, "warn");
            });
          }, 2 * 60 * 1000);
          scheduledTimeouts.push(deleteTimeout);
        } catch (err) {
          log(`[setupPvpEvent]: Failed to send ping: ${err.message}`, "error");
        }
      }, pingTime);
      scheduledTimeouts.push(t);
    }
    try {
      const embed = await commandEmbed({
        title: "PvP Event Schedule",
        color: 0x00bfff,
        timestamp: true,
        fields: upcoming.slice(0, 5).map(({ date }) => {
          const unix = Math.floor(date.getTime() / 1000);
          const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
          return { name: dayOfWeek, value: `<t:${unix}:F> - <t:${unix}:R>`, inline: false };
        }),
        footer: {
          text: `${bot.user.username} | ${new Date().toLocaleDateString("en-GB")}`,
          iconURL: bot.user.displayAvatarURL(),
        },
      });
      const messages = await channel.messages.fetch({ limit: 10 });
      const existing = messages.find(m => m.author.id === bot.user.id);
      if (existing) await existing.edit({ embeds: [embed] });
      else await channel.send({ embeds: [embed] });
    } catch (err) {
      log(`[setupPvpEvent]: Failed to update schedule embed: ${err.message}`, "error");
    }
    const refreshTimeout = setTimeout(scheduleEvents, 24 * 60 * 60 * 1000);
    scheduledTimeouts.push(refreshTimeout);
  };
  await scheduleEvents();
  log("[setupPvpEvent] registered.", "success");
};

export default setupPvpEvent;