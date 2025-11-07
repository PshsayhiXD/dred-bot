import fs from "fs";
import path from "path";
import paths from "../utils/path.js";
import config from "../config.js";
import log from "../utils/logger.js";
import { commandEmbed, sendChunks } from "../utils/commandComponent.js";
const changelogs = paths.database.changelogs;
const watching = paths.root;
const channelId = config.changelogsChannelID;
const ignore = (config.IGNORE_PATHS || []).map(p => path.resolve(watching, p));
const scanDir = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.resolve(d, e.name);
  if (ignore.some(i => p.startsWith(i))) return [];
  if (e.isDirectory()) return scanDir(p);
  const size = fs.statSync(p).size;
  return [[p, size]];
});
const loadData = () => fs.existsSync(changelogs) ? JSON.parse(fs.readFileSync(changelogs)) : {};
const saveData = d => fs.writeFileSync(changelogs, JSON.stringify(d, null, 2));
const formatSize = size => {
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB";
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + " MB";
  return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
};
const setupChangelogs = async bot => {
  const maxDay = config.MAX_CHANGELOG_AGE;
  const data = loadData();
  const snapshot = Object.fromEntries(scanDir(watching).map(([p, size]) => [p, { size }]));
  const nowDate = new Date().toISOString().split("T")[0];
  const tsNow = Math.floor(Date.now() / 1000);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDay);
  for (const date of Object.keys(data)) {
    if (new Date(date) < cutoff) delete data[date];
  }
  if (!data[nowDate]) {
    data[nowDate] = { files: snapshot, msgIds: [], added: [], modified: [], deleted: [] };
    saveData(data);
    log("[changelogs.js] initialized today, skipping changelog.", "warn");
    return;
  }
  data[nowDate].added ||= [];
  data[nowDate].modified ||= [];
  data[nowDate].deleted ||= [];
  const oldSnap = data[nowDate].files;
  const added = Object.keys(snapshot).filter(k => !oldSnap[k]);
  const deleted = Object.keys(oldSnap).filter(k => !snapshot[k]);
  const modified = Object.keys(snapshot).filter(k => oldSnap[k] && oldSnap[k].size !== snapshot[k].size);
  if (!added.length && !deleted.length && !modified.length) return;
  const timeFmt = () => `<t:${Math.floor(Date.now() / 1000)}:T>`;
  for (const f of added) data[nowDate].added.push(`\`${path.relative(watching, f)}\` ${timeFmt()}`);
  for (const f of deleted) data[nowDate].deleted.push(`\`${path.relative(watching, f)}\` ${timeFmt()}`);
  for (const f of modified) {
    const rel = path.relative(watching, f);
    const oldSize = oldSnap[f].size;
    const newSize = snapshot[f].size;
    data[nowDate].modified.push(`\`${rel}\` (${formatSize(oldSize)} → **${formatSize(newSize)}**) ${timeFmt()}`);
  }
  const embed = await commandEmbed({
    title: "📜 CHANGELOG",
    description: [
      `🟢 **Added**:\n${data[nowDate].added.join("\n") || "_no changes_"}`,
      `🟡 **Modified**:\n${data[nowDate].modified.join("\n") || "_no changes_"}`,
      `🔴 **Deleted**:\n${data[nowDate].deleted.join("\n") || "_no changes_"}`,
      `# 📜 Summary\n- Added: **${data[nowDate].added.length}** | Deleted: **${data[nowDate].deleted.length}** | Modified: **${data[nowDate].modified.length}** | Total Files: **${Object.keys(snapshot).length}**`
    ].join("\n\n")
  });
  const ch = await bot.channels.fetch(channelId);
  const sentMsgs = await sendChunks(ch, embed);
  data[nowDate].msgIds = sentMsgs.map(m => m.id);
  for (const f of added.concat(modified)) oldSnap[f] = snapshot[f];
  for (const f of deleted) delete oldSnap[f];
  saveData(data);
  log("[changelogs.js] registered.", "success");
};

export default setupChangelogs;