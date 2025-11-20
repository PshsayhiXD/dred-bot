import Database from "better-sqlite3";
import path from 'path';
import paths from "./path.js";
import fs from 'fs/promises';
import sharp from 'sharp';
const db = new Database(paths.database.clans);
const bannerDir = paths.database.clan_banners;
const iconDir = paths.database.clan_icons;
db.prepare(`
  CREATE TABLE IF NOT EXISTS clans (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    data TEXT
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS clan_members (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    clan TEXT NOT NULL
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS clan_requests (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    clan TEXT NOT NULL
  )
`).run();

const createClan = (owner, clan, data = "{}") => {
  const alreadyOwns = db.prepare("SELECT 1 FROM clans WHERE owner = ?").get(owner);
  const alreadyInClan = db.prepare("SELECT 1 FROM clan_members WHERE user = ?").get(owner);
  if (alreadyOwns || alreadyInClan) return { created: false, error: "[-] createClan: user already in or owns a clan." };
  let parsedData;
  try { parsedData = typeof data === "string" ? JSON.parse(data) : data;
  } catch { parsedData = {} }
  if (typeof parsedData !== "object" || parsedData === null) parsedData = {};
  parsedData.created = new Date().toISOString();
  const json = JSON.stringify(parsedData);
  db.prepare("INSERT INTO clans (id, owner, data) VALUES (?, ?, ?)").run(clan, owner, json);
  joinClan(owner, clan);
  setUpClanSettings(clan);
  return {
    owner,
    created: clan,
    data: parsedData
  };
};
const getClan = (clan) => {
  const row = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!row) return null;
  const parsedData = row.data ? JSON.parse(row.data) : {};
  return {
    id: row.id,
    owner: row.owner,
    ...parsedData
  };
};
const getClanByOwner = (owner) => {
  const result = db.prepare("SELECT * FROM clans WHERE owner = ?").get(owner);
  return { owner, result };
};
const getClanMemberCount = (clanId) => {
  const count = db.prepare("SELECT COUNT(*) as total FROM clan_members WHERE clan = ?").get(clanId);
  return count?.total || 0;
};
const getUserClan = (user) => {
  const member = db.prepare("SELECT clan FROM clan_members WHERE user = ?").get(user);
  if (!member) return { clan: null };
  const clan = db.prepare("SELECT * FROM clans WHERE id = ?").get(member.clan);
  return { member, clan };
};
const getAllClans = () => {
  const rows = db.prepare("SELECT * FROM clans").all();
  return rows.map(row => ({
    id: row.id,
    owner: row.owner,
    data: row.data ? JSON.parse(row.data) : {}
  }));
};
const deleteClan = (user, clan) => {
  const existing = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!existing || existing.owner !== user) return { deleted: false, error: "[-] deleteClan: clan not exist or not owns it." };
  db.prepare("DELETE FROM clans WHERE id = ?").run(clan);
  db.prepare("DELETE FROM clan_members WHERE clan = ?").run(clan);
  return { user, deleted: true, clan };
};
const updateClanData = (user, clan, data) => {
  const existing = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!existing || existing.owner !== user) return { updated: false, error: "[-] updateClanData: not owner or clan not found." };
  db.prepare("UPDATE clans SET data = ? WHERE id = ?").run(data, clan);
  return { user, clan, updated: true };
};
const isValidClan = (clan) => {
  const row = db.prepare("SELECT 1 FROM clans WHERE id = ?").get(clan);
  return { clan, valid: !!row };
};
const getClanSettings = (clan, keyPath = null) => {
  const row = db.prepare("SELECT data FROM clans WHERE id = ?").get(clan);
  if (!row) return { clan, settings: null, error: "[-] getClanSettings: clan not found." };
  const data = JSON.parse(row.data || "{}");
  if (!keyPath) return { clan, settings: data.settings ?? {} };
  const keys = keyPath.split(".");
  let current = data;
  for (const key of keys) {
    if (typeof current !== "object" || !(key in current)) return { clan, settings: null, error: "[-] getClanSettings: path invalid." };
    current = current[key];
  }
  return { clan, settings: current, path: keyPath };
};
const renameClan = (user, clan, newName) => {
  const existing = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!existing || existing.owner !== user) return { renamed: false, error: "[-] renameClan: not owner or clan not found." };
  const conflict = db.prepare("SELECT 1 FROM clans WHERE id = ?").get(newName);
  if (conflict) return { renamed: false, error: "[-] renameClan: new name already taken." };
  db.prepare("UPDATE clans SET id = ? WHERE id = ?").run(newName, clan);
  db.prepare("UPDATE clan_members SET clan = ? WHERE clan = ?").run(newName, clan);
  db.prepare("UPDATE clan_requests SET clan = ? WHERE clan = ?").run(newName, clan);
  return { user, clan, renamed: true, newName };
};
const setClanPassword = (owner, clan, password) => {
  const row = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!row || row.owner !== owner) return { set: false, error: "[-] setClanPassword: not owner or clan not found." };
  const data = JSON.parse(row.data || "{}");
  if (typeof data.settings !== "object" || data.settings === null) data.settings = {};
  data.settings.password = password;
  db.prepare("UPDATE clans SET data = ? WHERE id = ?").run(JSON.stringify(data), clan);
  return { set: true };
};
const customizeClanColor = (owner, clan, color) => {
  const row = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!row || row.owner !== owner) return { updated: false, error: "[-] customizeClanColor: not owner or clan not found." };
  const data = JSON.parse(row.data || "{}");
  if (typeof data.settings !== "object" || data.settings === null) data.settings = {};
  data.settings.color = color;
  db.prepare("UPDATE clans SET data = ? WHERE id = ?").run(JSON.stringify(data), clan);
  return { updated: true, color };
};
const setClanBanner = async (owner = null, clan, base64Img) => {
  if (!clan && owner) {
    const member = db.prepare("SELECT clan FROM clan_members WHERE user = ?").get(owner);
    if (!member) return { updated: false, error: "[-] setClanBanner: user not in a clan." };
    clan = member.clan;
  }
  const row = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!row) return { updated: false, error: "[-] setClanBanner: clan not found." };
  if (owner && row.owner !== owner) return { updated: false, error: "[-] setClanBanner: user is not owner." };
  const data = JSON.parse(row.data || "{}");
  if (typeof data.settings !== "object" || data.settings === null) data.settings = {};
  if (data.settings.bannerPath) try { await fs.unlink(data.settings.bannerPath); } catch {}
  const filename = `${clan}.png`;
  const filePath = path.join(bannerDir, filename);
  const cleanBase64 = base64Img.replace(/^data:image\/\w+;base64,/, "");
  await fs.writeFile(filePath, cleanBase64, "base64");
  data.settings.bannerPath = filePath;
  db.prepare("UPDATE clans SET data = ? WHERE id = ?").run(JSON.stringify(data), clan);
  return { updated: true, bannerPath: filePath };
};
const setUpClanSettings = (clanId) => {
  const existing = db.prepare("SELECT * FROM clans WHERE id = ?").get(clanId);
  if (!existing) return { success: false, error: "[-] setUpClanSettings: clan not found." };
  const defaultSettings = {
    private: false,
    approvalOnly: false,
    memberLimit: Infinity,
    password: null,
    admins: []
  };
  const data = JSON.parse(existing.data || "{}");
  if (typeof data.settings !== "object" || data.settings === null) data.settings = {};
  for (const [key, def] of Object.entries(defaultSettings)) {
    if (data.settings[key] === undefined) data.settings[key] = def;
  }
  db.prepare("UPDATE clans SET data = ? WHERE id = ?").run(JSON.stringify(data), clanId);
  return { success: true, clan: clanId, defaultsApplied: true };
};
const viewPendingClanRequests = (user, clan) => {
  const row = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!row) return { success: false, error: "[-] viewPendingClanRequests: clan not found." };
  const data = JSON.parse(row.data || "{}");
  const isOwner = row.owner === user;
  const admins = data.settings?.admins || [];
  const isAdmin = admins.includes(user);
  if (!isOwner && !isAdmin) return { success: false, error: "[-] viewPendingClanRequests: You are not authorized to view this clan's requests." };
  const requests = db.prepare("SELECT user FROM clan_requests WHERE clan = ?").all(row.id);
  return {
    success: true,
    clan: row.name,
    users: requests.map(r => r.user),
    message: requests.length ? null : "No pending requests.."
  };
};
const isClanPrivate = (clanId) => {
  const row = db.prepare("SELECT data FROM clans WHERE id = ?").get(clanId);
  const data = JSON.parse(row?.data || "{}");
  return data?.settings?.private === true;
};
const getClanMemberLimit = (clanId) => {
  const row = db.prepare("SELECT data FROM clans WHERE id = ?").get(clanId);
  const data = JSON.parse(row?.data || "{}");
  return data?.settings?.memberLimit ?? 50;
};
const getClanRequestCount = (clanId) => {
  const row = db.prepare("SELECT COUNT(*) as count FROM clan_requests WHERE clan = ?").get(clanId);
  return row?.count || 0;
};
const setClanIcon = async (owner = null, clan, base64Img) => {
  if (!clan && owner) {
    const member = db.prepare("SELECT clan FROM clan_members WHERE user = ?").get(owner);
    if (!member) return { updated: false, error: "[-] setClanIcon: user not in a clan." };
    clan = member.clan;
  }
  const row = db.prepare("SELECT * FROM clans WHERE id = ?").get(clan);
  if (!row) return { updated: false, error: "[-] setClanIcon: clan not found." };
  if (owner && row.owner !== owner) return { updated: false, error: "[-] setClanIcon: user is not owner." };
  const data = JSON.parse(row.data || "{}");
  if (typeof data.settings !== "object" || data.settings === null) data.settings = {};
  if (data.settings.iconPath) try { await fs.unlink(data.settings.iconPath); } catch {}
  const filename = `${clan}.png`;
  const filePath = path.join(iconDir, filename);
  const cleanBase64 = base64Img.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  await sharp(buffer).resize(128, 128).png().toFile(filePath);
  data.settings.iconPath = filePath;
  db.prepare("UPDATE clans SET data = ? WHERE id = ?").run(JSON.stringify(data), clan);
  return { updated: true, iconPath: filePath };
};
export {
  getClanMemberCount, 
  getClanMemberLimit, 
  isClanPrivate,
  getClanRequestCount,
  createClan,
  getClan,
  getClanByOwner,
  getUserClan,
  getAllClans,
  deleteClan,
  updateClanData,
  isValidClan,
  setClanPassword,
  customizeClanColor,
  setClanBanner,
  setUpClanSettings,
  viewPendingClanRequests,
  renameClan,
  getClanSettings,
  setClanIcon,
};

export default db;