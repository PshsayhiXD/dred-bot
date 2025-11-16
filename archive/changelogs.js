///tasks/
import fs from 'fs';
import path from 'path';
import paths from '../utils/path.js';
import config from '../config.js';
import log from '../utils/logger.js';
import thisFile from '../utils/thisFile.js';
import { sendChunks } from '../utils/commandComponent.js';
const changelogs = paths.database.changelogs;
const tempDir = paths.temp;
const watching = paths.dirRoot;
const channelId = config.changelogsChannelID;
const ignore = (config.IGNORE_PATHS || []).map(p => path.resolve(watching, p));
const maxAge = config.MAX_CHANGELOG_AGE;
const skip_send_first = config.SKIP_CHANGELOG_FIRST_RUN;
const loadJSON = p => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : {});
const saveJSON = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));
const scanFiles = () => {
  const stack = [watching],
    out = [];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.resolve(dir, e.name);
      if (ignore.some(i => p.startsWith(i))) continue;
      e.isDirectory() ? stack.push(p) : out.push(p);
    }
  }
  return out;
};
const formatSize = s => (s < 1024 ? s + ' B' : s < 1024 ** 2 ? (s / 1024).toFixed(2) + ' KB' : s < 1024 ** 3 ? (s / 1024 ** 2).toFixed(2) + ' MB' : (s / 1024 ** 3).toFixed(2) + ' GB');
const buildTreeStr = (files, prefix = '') => {
  let str = '';
  const entries = Object.entries(files);
  entries.forEach(([name, val], i) => {
    const last = i === entries.length - 1;
    const ptr = last ? '└─' : '├─';
    if (typeof val === 'object' && ('size' in val || 'oldSize' in val || 'newSize' in val)) {
      const size = val.size ? ` (${formatSize(val.size)})` : val.oldSize ? ` (${formatSize(val.oldSize)} → ${formatSize(val.newSize)})` : '';
      const ts = val.timestamp ? ` [${val.timestamp}]` : '';
      str += `${prefix}${ptr} ${name}${size}${ts}\n`;
    } else if (typeof val === 'object') {
      str += `${prefix}${ptr} ${name}/\n`;
      str += buildTreeStr(val, prefix + (last ? '   ' : '│  '));
    }
  });
  return str;
};
const setupChangelogs = async bot => {
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const data = loadJSON(changelogs);
  const snapFile = changelogs.replace('.json', '_snapshot.json');
  const oldSnap = loadJSON(snapFile);
  const files = scanFiles();
  if (Object.keys(oldSnap).length >= files.length && !skip_send_first) {
    log('[changelogs.js] Snapshot already contains all files, skipping send.', 'info');
    return { ok: true };
  }
  const snap = {};
  for (const p of files) {
    const rel = path.relative(watching, p);
    const st = fs.statSync(p);
    const prev = oldSnap[rel];
    if (prev && prev.size === st.size && prev.mtime === st.mtimeMs) snap[rel] = prev;
    else snap[rel] = { size: st.size, mtime: st.mtimeMs };
  }
  saveJSON(snapFile, snap);
  const date = new Date().toISOString().split('T')[0];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAge);
  for (const d of Object.keys(data)) if (new Date(d) < cutoff) delete data[d];
  data[date] ||= { files: {}, msgIds: [], added: [], modified: [], deleted: [] };
  const old = data[date].files;
  const oldKeys = Object.keys(old),
    newKeys = Object.keys(snap);
  const added = newKeys.filter(k => !old[k]);
  const deleted = oldKeys.filter(k => !snap[k]);
  const modified = newKeys.filter(k => old[k] && old[k].size !== snap[k].size);
  if (!added.length && !deleted.length && !modified.length) {
    log('[changelogs.js] No changes detected, skipping send.', 'info');
    return { ok: true };
  }
  const t = () => `<t:${Math.floor(Date.now() / 1000)}:T>`;
  added.forEach(f => data[date].added.push({ path: f, timestamp: t() }));
  deleted.forEach(f => data[date].deleted.push({ path: f, timestamp: t() }));
  modified.forEach(f => data[date].modified.push({ path: f, timestamp: t(), oldSize: old[f].size, newSize: snap[f].size }));
  const sections = [
    { title: '🟢 Added', list: data[date].added },
    { title: '🟡 Modified', list: data[date].modified },
    { title: '🔴 Deleted', list: data[date].deleted },
  ];
  let txt = '';
  for (const s of sections) {
    if (!s.list.length) {
      txt += s.title + ':\n_no changes_\n\n';
      continue;
    }
    const obj = Object.fromEntries(
      s.list.map(f => {
        const info = { timestamp: f.timestamp };
        if ('oldSize' in f && 'newSize' in f) {
          info.oldSize = f.oldSize;
          info.newSize = f.newSize;
        } else info.size = f.newSize || f.oldSize || 0;
        return [f.path, info];
      })
    );
    txt += s.title + ':\n' + buildTreeStr(obj) + '\n\n';
  }
  const ch = await bot.channels.fetch(channelId);
  const sentMsgs = await sendChunks(ch, txt, true);
  const oldIds = data[date].msgIds || [];
  const newIds = [];
  for (let i = 0; i < sentMsgs.length; i++) {
    try {
      if (oldIds[i]) {
        const m = await ch.messages.fetch(oldIds[i]);
        await m.edit({ content: sentMsgs[i].content, embeds: sentMsgs[i].embeds });
        newIds.push(m.id);
        await sentMsgs[i].delete();
      } else newIds.push(sentMsgs[i].id);
    } catch {
      newIds.push(sentMsgs[i].id);
    }
  }
  data[date].msgIds = newIds;
  for (const f of added.concat(modified)) old[f] = snap[f];
  for (const f of deleted) delete old[f];
  saveJSON(changelogs, data);
  log(`[${thisFile(import.meta.url)}] registered.`, 'success');
  return { ok: true };
};
export default setupChangelogs;