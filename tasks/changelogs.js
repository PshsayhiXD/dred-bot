import fs from "fs";
import path from "path";
import paths from "../utils/path.js";
import config from "../config.js";
import log from "../utils/logger.js";
import { sendChunks } from "../utils/commandComponent.js";
const changelogs = paths.database.changelogs;
const watching = paths.root;
const channelId = config.changelogsChannelID;
const ignore = (config.IGNORE_PATHS || []).map(p => path.resolve(watching, p));
const scanDir = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.resolve(d, e.name);
  if (ignore.some(i => p.startsWith(i))) return [];
  if (e.isDirectory()) return scanDir(p);
  return [[p, fs.statSync(p).size]];
});
const loadData = () => fs.existsSync(changelogs) ? JSON.parse(fs.readFileSync(changelogs)) : {};
const saveData = d => fs.writeFileSync(changelogs, JSON.stringify(d, null, 2));
const formatSize = size => {
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB";
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + " MB";
  return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
};
const buildTree = (files) => {
  const tree = {};
  for (const [relPath, info] of Object.entries(files)) {
    const parts = relPath.split(path.sep);
    let node = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) node[part] = info;
      else {
        node[part] ||= {};
        node = node[part];
      }
    }
  }
  return tree;
};
const formatTree = (node, prefix = "") => {
  let str = "";
  const entries = Object.entries(node);
  entries.forEach(([name, value], idx) => {
    const isLast = idx === entries.length - 1;
    const pointer = isLast ? "└─" : "├─";
    if (typeof value === "object" && !("size" in value) && !("timestamp" in value)) {
      str += `${prefix}${pointer} ${name}/\n`;
      str += formatTree(value, prefix + (isLast ? "   " : "│  "));
    } else {
      const ts = value.timestamp ? ` [${value.timestamp}]` : "";
      const size = value.size ? ` (${formatSize(value.size)})` : "";
      str += `${prefix}${pointer} ${name}${size}${ts}\n`;
    }
  });
  return str;
};
const setupChangelogs = async bot => {
  const maxDay = config.MAX_CHANGELOG_AGE;
  const data = loadData();
  const snapshot = Object.fromEntries(scanDir(watching).map(([p, size]) => [path.relative(watching, p), { size }]));
  const nowDate = new Date().toISOString().split("T")[0];
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
  const addedFiles = Object.keys(snapshot).filter(k => !oldSnap[k]);
  const deletedFiles = Object.keys(oldSnap).filter(k => !snapshot[k]);
  const modifiedFiles = Object.keys(snapshot).filter(k => oldSnap[k] && oldSnap[k].size !== snapshot[k].size);
  if (!addedFiles.length && !deletedFiles.length && !modifiedFiles.length) return;
  const timeFmt = () => `<t:${Math.floor(Date.now() / 1000)}:T>`;
  for (const f of addedFiles) data[nowDate].added.push({ path: f, timestamp: timeFmt() });
  for (const f of deletedFiles) data[nowDate].deleted.push({ path: f, timestamp: timeFmt() });
  for (const f of modifiedFiles) data[nowDate].modified.push({ path: f, timestamp: timeFmt(), oldSize: oldSnap[f].size, newSize: snapshot[f].size });
  const sections = [
    { title: "🟢 Added", files: data[nowDate].added },
    { title: "🟡 Modified", files: data[nowDate].modified },
    { title: "🔴 Deleted", files: data[nowDate].deleted }
  ];
  const embeds = [];
  for (const [idx, section] of sections.entries()) {
    if (!section.files.length) continue;
    const filesObj = Object.fromEntries(section.files.map(f => [f.path, { size: f.newSize || f.oldSize || 0, timestamp: f.timestamp }]));
    const treeStr = "```" + formatTree(buildTree(filesObj)) + "```";
    embeds.push({
      title: idx === 0 ? "📜 CHANGELOG" : null,
      description: `${section.title}:\n${treeStr}`
    });
  }
  const ch = await bot.channels.fetch(channelId);
  const sentMsgs = [];
  for (const e of embeds) sentMsgs.push(...await sendChunks(ch, e));
  data[nowDate].msgIds = sentMsgs.map(m => m.id);
  for (const f of addedFiles.concat(modifiedFiles)) oldSnap[f] = snapshot[f];
  for (const f of deletedFiles) delete oldSnap[f];
  saveData(data);
  log("[changelogs.js] registered.", "success");
};

export default setupChangelogs;