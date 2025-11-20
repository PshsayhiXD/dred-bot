import fs from 'fs';
import paths from './path.js';
const dbP = paths.database.deleteScheduler;
const loadDeletes = () => {
  if (!fs.existsSync(dbP)) return [];
  return JSON.parse(fs.readFileSync(dbP, 'utf-8'));
};
const saveDeletes = (data) => {
  fs.writeFileSync(dbP, JSON.stringify(data, null, 2));
};

export const scheduleDelete = async (bot, channelId, messageId, delay = 15000) => {
  const deleteAt = Date.now() + delay;
  const pending = loadDeletes();
  pending.push({ channelId, messageId, deleteAt });
  saveDeletes(pending);
  setTimeout(async () => {
    try {
      const channel = await bot.channels.fetch(channelId);
      const msg = await channel.messages.fetch(messageId);
      await msg.delete();
    } catch {}
    removeDelete(channelId, messageId);
  }, delay);
};
export const removeDelete = (channelId, messageId) => {
  const pending = loadDeletes();
  const filtered = pending.filter(m => !(m.channelId === channelId && m.messageId === messageId));
  saveDeletes(filtered);
};
export const rescheduleAll = async (bot) => {
  const pending = loadDeletes();
  const now = Date.now();
  for (const { channelId, messageId, deleteAt } of pending) {
    const delay = deleteAt - now;
    if (delay <= 0) {
      try {
        const channel = await bot.channels.fetch(channelId);
        const msg = await channel.messages.fetch(messageId);
        await msg.delete();
      } catch {}
      removeDelete(channelId, messageId);
    } else {
      setTimeout(async () => {
        try {
          const channel = await bot.channels.fetch(channelId);
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
        } catch {}
        removeDelete(channelId, messageId);
      }, delay);
    }
  }
};

export const deleteAllDms = async (bot) => {
  let total = 0;
  for (const [, channel] of bot.channels.cache) {
    if (channel.type === 1) {
      let fetched;
      do {
        fetched = await channel.messages.fetch({ limit: 50 });
        const botMsgs = fetched.filter(m => m.author.id === bot.user.id);
        for (const msg of botMsgs.values()) {
          await msg.delete().catch(() => {});
          total++;
        }
      } while (fetched.size >= 50);
    }
  }
  return { success: true, deleted: total };
};

export const deleteDmWithUser = async (bot, userId) => {
  const user = await bot.users.fetch(userId);
  if (!user) return `[deleteDmWithUser] User ${userId} not found.`;
  const dm = await user.createDM();
  let deleted = 0;
  let fetched;
  do {
    fetched = await dm.messages.fetch({ limit: 50 });
    const botMsgs = fetched.filter(m => m.author.id === bot.user.id);
    for (const msg of botMsgs.values()) {
      await msg.delete().catch(() => {});
      deleted++;
    }
  } while (fetched.size >= 50);
  return { success: true, deleted };
};