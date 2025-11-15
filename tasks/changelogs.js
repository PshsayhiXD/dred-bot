import fs from 'fs';
import path from 'path';
import paths from '../utils/path.js';
import config from '../config.js';
import log from '../utils/logger.js';
const changelogs = paths.database.changelogs;
const watching = paths.root;
const tempDir = paths.temp;
const channelId = config.changelogsChannelID;
const ignore = (config.IGNORE_PATHS || []).map(p => path.resolve(watching, p));
const scanDir = d =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = path.resolve(d, e.name);
    if (ignore.some(i => p.startsWith(i))) return [];
    if (e.isDirectory()) return scanDir(p);
    return [[p, fs.statSync(p).size]];
  });
const loadData = () => (fs.existsSync(changelogs) ? JSON.parse(fs.readFileSync(changelogs)) : {});
const saveData = d => fs.writeFileSync(changelogs, JSON.stringify(d, null, 2));
const formatSize = s => {
  if (s < 1024) return s + ' B';
  if (s < 1024 * 1024) return (s / 1024).toFixed(2) + ' KB';
  if (s < 1024 * 1024 * 1024) return (s / (1024 * 1024)).toFixed(2) + ' MB';
  return (s / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};
const buildTree = files => {
  const tree = {};
  for (const [rel, info] of Object.entries(files)) {
    const parts = rel.split(path.sep);
    let n = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) n[part] = info;
      else {
        n[part] ||= {};
        n = n[part];
      }
    }
  }
  return tree;
};
const formatTree = (node, prefix = '') => {
  let str = '';
  const entries = Object.entries(node);
  entries.forEach(([name, val], i) => {
    const last = i === entries.length - 1;
    const ptr = last ? '└─' : '├─';
    if (typeof val === 'object' && !('size' in val) && !('oldSize' in val)) {
      str += `${prefix}${ptr} ${name}/\n`;
      str += formatTree(val, prefix + (last ? '   ' : '│  '));
    } else {
      const ts = val.timestamp ? ` [${val.timestamp}]` : '';
      let size = '';
      if ('oldSize' in val && 'newSize' in val) size = ` (${formatSize(val.oldSize)} → ${formatSize(val.newSize)})`;
      else if ('size' in val) size = ` (${formatSize(val.size)})`;
      str += `${prefix}${ptr} ${name}${size}${ts}\n`;
    }
  });
  return str;
};
const setupChangelogs = async (bot) => {
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const max = config.MAX_CHANGELOG_AGE;
  const data = loadData();
  const snap = Object.fromEntries(scanDir(watching).map(([p, s]) => [path.relative(watching, p), { size: s }]));
  const date = new Date().toISOString().split('T')[0];
  log(`[changelogs.js] snapshot contains ${Object.keys(snap).length} files`, 'info');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - max);
  for (const d of Object.keys(data)) if (new Date(d) < cutoff) delete data[d];
  if (!data[date]) data[date] = { files: {}, msgIds: [], added: [], modified: [], deleted: [] };
  const old = data[date].files || {};
  const oldKeys = Object.keys(old);
  const newKeys = Object.keys(snap);
  const same = oldKeys.length === newKeys.length && oldKeys.every(k => snap[k] && snap[k].size === old[k].size);
  if (same) return log('[changelogs.js] snapshot unchanged, skipping.', 'info');
  const added = newKeys.filter(k => !old[k]);
  const deleted = oldKeys.filter(k => !snap[k]);
  const modified = newKeys.filter(k => old[k] && old[k].size !== snap[k].size);
  log(`[changelogs.js] computed changes: added=${added.length} modified=${modified.length} deleted=${deleted.length}`, 'info');
  const t = () => `<t:${Math.floor(Date.now() / 1000)}:T>`;
  for (const f of added) data[date].added.push({ path: f, timestamp: t() });
  for (const f of deleted) data[date].deleted.push({ path: f, timestamp: t() });
  for (const f of modified)
    data[date].modified.push({ path: f, timestamp: t(), oldSize: old[f].size, newSize: snap[f].size });
  const sections = [
    { title: '🟢 Added', list: data[date].added },
    { title: '🟡 Modified', list: data[date].modified },
    { title: '🔴 Deleted', list: data[date].deleted },
  ];
  const out = [];
  for (const s of sections) {
    if (!s.list.length) {
      out.push(s.title + ':\n_no changes_');
      continue;
    }
    const obj = Object.fromEntries(s.list.map(f => {
      const info = { timestamp: f.timestamp };
      if ('oldSize' in f && 'newSize' in f) {
        info.oldSize = f.oldSize;
        info.newSize = f.newSize;
      } else info.size = f.newSize || f.oldSize || 0;
      return [f.path, info];
    }));
    out.push(s.title + ':\n' + formatTree(buildTree(obj)));
  }
  const txt = out.join('\n\n');
  const ch = await bot.channels.fetch(channelId);
  if (data[date].msgIds.length) {
    try {
      const msg = await ch.messages.fetch(data[date].msgIds[0]);
      await msg.edit({ content: txt });
    } catch {
      const msg = await ch.send({ content: txt });
      data[date].msgIds = [msg.id];
    }
  } else {
    const msg = await ch.send({ content: txt });
    data[date].msgIds = [msg.id];
  }
  for (const f of added.concat(modified)) old[f] = snap[f];
  for (const f of deleted) delete old[f];
  saveData(data);
  log('[changelogs.js] registered.', 'success');
  return { ok: true };
};

export default setupChangelogs;