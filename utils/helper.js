import fs from 'fs/promises';
import dns from 'dns';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { decode, encode, BuildCmd, Item } from 'dsabp-js';
import crypto from 'crypto';
import { evaluate } from 'mathjs';
import sharp from 'sharp';
import Color from 'color';
import chalkLib from 'chalk';
import * as cheerio from 'cheerio';
import { createCanvas, loadImage } from 'canvas';
import { DateTime } from "luxon";
import argon2 from 'argon2';
import paths from './path.js';
import config from '../config.js';
import * as commandUsage from '../commands/command-usage.js';
import * as commandComponent from './commandComponent.js';
import * as getcommand from './getcommand.js';
import log from './logger.js';

import { scheduleDelete, removeDelete, rescheduleAll, deleteDmWithUser, deleteAllDms } from './deleteScheduler.js';

import {
  readData,
  writeData,
  readText,
  writeText,
  loadData,
  loadAllData,
  loadDataByAccountId,
  loadUsernameByAccountId,
  saveData,
  isValidUser,
  writeEnv,
  readEnv,
  envAll,
  quickSaveUserIdData,
  loadDataByAccountCookie,
  loadUsernameByAccountCookie,
  loadAllUsers,
} from './db.js';
import {
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
} from './clan.js';
import { getAllListings, getListing, saveListing, deleteListing } from './marketplace.js';
import { saveTrade, getTrade, getAllTrades, getUserTrades, deleteTrade, cleanUpExpiredTrades } from './trade.js';

export const clan = {
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
export const marketplace = {
  getAllListings,
  getListing,
  saveListing,
  deleteListing,
};
export const deleteSchedule = {
  scheduleDelete,
  removeDelete,
  rescheduleAll,
  deleteDmWithUser,
  deleteAllDms,
};
export const trade = {
  saveTrade,
  getTrade,
  getAllTrades,
  getUserTrades,
  deleteTrade,
  cleanUpExpiredTrades,
};

import clanDB from './clan.js';
import DB from './db.js';
import marketplaceDB from './marketplace.js';
import tradeDB from './trade.js';

import { items } from './items/index.js';
import { skills } from './skills/index.js';
import { researchs } from './researchs/index.js';
import { achievements } from './achievements/index.js';
import { quests } from './quests/index.js';
import { enchants } from './enchants/index.js';
import { recipes } from './recipes/index.js';
import { jobs } from './jobs/index.js';
import { pets } from './pets/index.js';

const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = Object.assign({}, options, { family: 4 });
  return originalLookup.call(this, hostname, options, callback);
};

let cooldowns = {};
let schedule;

export const selfWrap = (func) => {
  return function (...args) {
    return func.apply(func, args);
  };
};

export const hashPassword = selfWrap(async function hasPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    salt,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  return hash;
});
export const verifyPassword = selfWrap(async function verifyPassword(password, hash) {
  const ok = await argon2.verify(hash, password);
  return ok;
});
export const genPassword = async () => {
  const specials = "!@#$%^&*";
  const bytes = crypto.randomBytes(12);
  const base = bytes.toString("base64").replace(/[^a-zA-Z0-9]/g, "");
  const s = specials[Math.floor(Math.random() * specials.length)];
  const plain = base.slice(0, 10) + s + Math.floor(Math.random() * 90 + 10);
  const salt = crypto.randomBytes(16);
  const hash = await argon2.hash(plain, {
    type: argon2.argon2id,
    salt,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
  return { password: plain, hash };
};

export const makeKeyPair = selfWrap(async function makeKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { pub: publicKey, priv: privateKey };
});
export const encryptAccount = selfWrap(async function encryptAccount(user, data, pub) {
  if (!(await isValidUser(user))) return null;
  const b64u = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload = JSON.stringify({ id, data });
  const sym = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", sym, iv);
  const ct = Buffer.concat([c.update(payload, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  const encSym = crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, sym);
  return { token: [b64u(encSym), b64u(iv), b64u(ct), b64u(tag)].join(".") };
});
export const decryptAccount = selfWrap(async function decryptAccount(user, token, priv) {
  const ub64 = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  try {
    const [es, iv, ct, tg] = token.split(".").map(ub64);
    const sym = crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, es);
    const d = crypto.createDecipheriv("aes-256-gcm", sym, iv);
    d.setAuthTag(tg);
    const payload = Buffer.concat([d.update(ct), d.final()]).toString("utf8");
    const obj = JSON.parse(payload);
    if (obj.user !== user) return errorMsg(this.name, "user mismatched.");
    return successMsg(this.name, "", 0o0, { data: obj.data });
  } catch {
    return errorMsg(this.name, "invalid or tampered token.");
  }
});

export const randomNumber = selfWrap(async function randomNumber(min = 0, max = 1) {
  if (max < min) [min, max] = [max, min];
  const range = max - min;
  const bytes = crypto.randomBytes(6);
  const num = parseInt(bytes.toString('hex'), 16);
  const fraction = num / 0xffffffffffff;
  return min + fraction * range;
});
export const gambleRandomNumber = selfWrap(async function gambleRandomNumber(min = 0, max = 1, multiplier = 1) {
  if (max < min) [min, max] = [max, min];
  const range = max - min;
  const bytes = crypto.randomBytes(6);
  const num = parseInt(bytes.toString('hex'), 16);
  const fraction = num / 0xffffffffffff;
  const result = min + fraction * range;
  return result * multiplier;
});
export const isWifiConnected = async () => {
  const start = performance.now();
  return new Promise(r => {
    dns.lookup("google.com", err => {
      const ms = Math.round(performance.now() - start);
      r({ connected: !err, latency: !err ? ms + " ms" : null });
    });
  });
};

export const key = selfWrap(async function key() {
  ({ ...process.env });
});
export const fileexists = selfWrap(async function fileexists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
});
export const getFileContent = selfWrap(async function getFileContent(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length <= 1000) return null;
    const timestamp = Date.now();
    const fileName = `getfilecontent-${timestamp}.txt`;
    const outPath = path.join(paths.temp, fileName);
    await fs.promises.writeFile(outPath, content, 'utf-8');
    return outPath;
  } catch {
    return null;
  }
});
export const clearGetFileContentFiles = selfWrap(async function clearGetFileContentFiles(intervalMs = 10000, maxAgeMs = 30000) {
  setInterval(async () => {
    try {
      const files = await fs.promises.readdir(paths.temp);
      const now = Date.now();
      const oldFiles = files
        .filter(f => f.startsWith('getfilecontent-') && f.endsWith('.txt'))
        .filter(f => {
          const timestamp = Number(f.match(/getfilecontent-(\d+)\.txt/)?.[1] || 0);
          return now - timestamp > maxAgeMs;
        });
      await Promise.all(oldFiles.map(f => fs.promises.unlink(path.join(paths.temp, f))));
    } catch {}
  }, intervalMs);
});

export const errorMsg = selfWrap(async function errorMsg(func, reason, code = 0o0, rest = {}) {
  if (typeof code !== 'number') {
    rest = code;
    code = 0;
  }
  const r = reason.replace(/\.$/gm, "").split("\n").map(line => line.charAt(0).toUpperCase() + line.slice(1)).join("\n");
  return {
    ok: false,
    success: false,
    valid: false,
    msg: `[-] ${func}: ${r}`,
    error: `[-] ${func}: ${r}`,
    err: `[-] ${func}: ${r}`,
    code,
    ...rest,
  };
});
export const throwError = selfWrap(async function throwError(func, reason) {
  let msg;
  if (!reason && func.startsWith('[-]')) {
    const m = func.match(/\[-\]\s*([^:]+):\s*(.*)/);
    if (m) {
      msg = m[2];
      func = m[1];
    } else msg = "Unknown error";
  } else msg = reason || "Unknown error";
  msg = msg.replace(/\.$/gm, "").split("\n").map(line => line.charAt(0).toUpperCase() + line.slice(1)).join("\n");
  throw new Error(`[-] ${func}: ${msg}`);
});
export const successMsg = selfWrap(async function successMsg(func, msg, code = 0o0, rest = {}) {
  if (typeof code !== "number") {
    rest = code;
    code = 0;
  }
  const dotted = msg.replace(/\.$/gm, "");
  const m = dotted.split("\n").map(line => line.charAt(0).toUpperCase() + line.slice(1)).join("\n");
  return {
    ok: true,
    success: true,
    valid: true,
    msg: `[+] ${func}: ${m}`,
    code,
    ...rest,
  };
});
export const parseAmount = selfWrap(async function parseAmount(input) {
  if (typeof input !== 'string') return NaN;
  const multipliers = {
    k: 1e3,
    thousand: 1e3,
    m: 1e6,
    mil: 1e6,
    million: 1e6,
    b: 1e9,
    bil: 1e9,
    billion: 1e9,
    t: 1e12,
    tril: 1e12,
    trillion: 1e12,
    q: 1e15,
    qd: 1e15,
    quadrillion: 1e15,
    qi: 1e18,
    quintillion: 1e18,
    sx: 1e21,
    sextillion: 1e21,
    sp: 1e24,
    septillion: 1e24,
    o: 1e27,
    oc: 1e27,
    octillion: 1e27,
    n: 1e30,
    no: 1e30,
    nonillion: 1e30,
    de: 1e33,
    decillion: 1e33,
    ude: 1e36,
    undecillion: 1e36,
    duo: 1e39,
    duodecillion: 1e39,
    td: 1e42,
    tredecillion: 1e42,
    qt: 1e45,
    quattuordecillion: 1e45,
    qd: 1e48,
    quindecillion: 1e48,
    sd: 1e51,
    sexdecillion: 1e51,
    sd: 1e54,
    septendecillion: 1e54,
    od: 1e57,
    octodecillion: 1e57,
    nd: 1e60,
    novemdecillion: 1e60,
    vd: 1e63,
    vigintillion: 1e63,
  };
  try {
    input = input.toLowerCase().replace(/,/g, '').replace(/\s+/g, '');
    input = input.replace(/(\d+(\.\d+)?)([a-z]+)/gi, (_, num, __, suffix) => {
      return multipliers[suffix] ? parseFloat(num) * multipliers[suffix] : _;
    });
    const result = evaluate(input);
    return isNaN(result) ? NaN : Math.floor(result);
  } catch {
    return NaN;
  }
});
export const parseBet = selfWrap(async function parseBet(input, bal) {
  if (!input) return errorMsg(`${this.name}`, 'No bet amount provided.', 0o0, { bet: 0 });
  const suffixMap = {
    k: 1e3,
    m: 1e6,
    b: 1e9,
    t: 1e12,
    qd: 1e15,
    qi: 1e18,
    sx: 1e21,
    sp: 1e24,
    o: 1e27,
    n: 1e30,
    de: 1e33,
    ude: 1e36,
    duo: 1e39,
    td: 1e42,
    qt: 1e45,
    qd2: 1e48,
    sd: 1e51,
    sd2: 1e54,
    od: 1e57,
    nd: 1e60,
    vd: 1e63,
  };
  input = input.toLowerCase().trim();
  if (input === 'all') return successMsg(`${this.name}`, 'parsed', 0o0, { bet: bal });
  if (input === 'half') return successMsg(`${this.name}`, 'parsed', 0o0, { bet: Math.floor(bal / 2) });
  input = input.replace(/(\d+(?:\.\d+)?)([a-z]+)/gi, (_, num, suf) => {
    const mul = suffixMap[suf] || 1;
    return `(${num}*${mul})`;
  });
  let bet;
  try {
    bet = evaluate(input);
  } catch {
    return errorMsg(`${this.name}`, 'Invalid bet format.', 0o0, { bet: 0 });
  }
  if (typeof bet !== 'number' || isNaN(bet) || bet <= 0) return errorMsg(`${this.name}`, 'Bet must be a positive number.', 0o0, { bet: 0 });
  if (bet > bal) return errorMsg(`${this.name}`, 'Insufficient balance for this bet.', 0o0, { bet: 0 });
  return successMsg(`${this.name}`, 'parsed', 0o0, { bet: Math.floor(bet) });
});
export const formatAmount = selfWrap(async function formatAmount(num, options = {}) {
  if (typeof num !== 'number' || isNaN(num)) return 'NaN';
  const {
    decimals = 2, // How many decimal places to keep (1.00 or 1)
    useLong = false, // Whether to use full words (million) instead of short (M)
    padZeros = false, // Whether to keep trailing zeroes like "1.00M"
    prefix = '', // Optional prefix, like "$"
    parentheses = false, // Wrap negatives like (1.5M)
    useLocale = false, // Use locale separators (1,000 vs 1.000)
    minAbbrev = 1000, // Minimum number to abbreviate (else show raw)
    bold = false, // Whether to bold the number
  } = options;
  const suffixes = [
    { value: 1e63, short: 'vd', long: 'vigintillion' },
    { value: 1e60, short: 'nd', long: 'novemdecillion' },
    { value: 1e57, short: 'od', long: 'octodecillion' },
    { value: 1e54, short: 'sd', long: 'septendecillion' },
    { value: 1e51, short: 'sd', long: 'sexdecillion' },
    { value: 1e48, short: 'qd', long: 'quindecillion' },
    { value: 1e45, short: 'qt', long: 'quattuordecillion' },
    { value: 1e42, short: 'td', long: 'tredecillion' },
    { value: 1e39, short: 'duo', long: 'duodecillion' },
    { value: 1e36, short: 'ude', long: 'undecillion' },
    { value: 1e33, short: 'de', long: 'decillion' },
    { value: 1e30, short: 'n', long: 'nonillion' },
    { value: 1e27, short: 'o', long: 'octillion' },
    { value: 1e24, short: 'sp', long: 'septillion' },
    { value: 1e21, short: 'sx', long: 'sextillion' },
    { value: 1e18, short: 'qi', long: 'quintillion' },
    { value: 1e15, short: 'qd', long: 'quadrillion' },
    { value: 1e12, short: 'T', long: 'trillion' },
    { value: 1e9, short: 'B', long: 'billion' },
    { value: 1e6, short: 'M', long: 'million' },
    { value: 1e3, short: 'K', long: 'thousand' },
  ];
  const isNegative = num < 0;
  const abs = Math.abs(num);
  for (let { value, short, long } of suffixes) {
    if (abs >= value && abs >= minAbbrev) {
      let formatted = (abs / value).toFixed(decimals);
      if (!padZeros) formatted = formatted.replace(/\.00$/, '');
      const unit = useLong ? ` ${long}` : short;
      const final = `${prefix}${formatted}${unit}`;
      return isNegative ? (bold ? `(**-${final}**)` : parentheses ? `(${final})` : `-${final}`) : bold ? `(**${final}**)` : final;
    }
  }
  let base = useLocale ? abs.toLocaleString() : abs.toFixed(decimals);
  if (!padZeros) base = base.replace(/\.00$/, '');
  const final = `${prefix}${base}`;
  return isNegative ? (bold ? `(**-${final}**)` : parentheses ? `(${final})` : `-${final}`) : bold ? `(**${final}**)` : final;
});
export const isInteger = selfWrap(async function isInteger(num) {
  return Number.isInteger(num);
});
export const formatTime = selfWrap(async function formatTime(ms) {
  if (typeof ms !== "number" || isNaN(ms) || ms <= 0) return "0s";
  let seconds = Math.floor(ms / 1000);
  const y = Math.floor(seconds / (365 * 24 * 3600));
  seconds %= 365 * 24 * 3600;
  const mo = Math.floor(seconds / (30 * 24 * 3600));
  seconds %= 30 * 24 * 3600;
  const d = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts = [];
  if (y) parts.push(`${y}y`);
  if (mo) parts.push(`${mo}mo`);
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
});
export const formatDate = selfWrap(async function formatDate(date) {
  return date.toISOString().slice(0, 10);
});
export const parseDate = selfWrap(async function parseDate(str) {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
});
export const testEnv = selfWrap(async function testEnv(envName = 'all') {
  return `Test already done. function is deprecated.`;
  if (envName === 'all') {
    const envs = await envAll();
    const results = [];
    for (const [key, value] of Object.entries(envs)) {
      try {
        const result = await readEnv(key);
        results.push({ key, value: result, ok: true });
      } catch (err) {
        results.push({ key, value: null, ok: false, error: err.message });
      }
    }
    return results;
  } else {
    try {
      const value = await readEnv(envName);
      return successMsg(this.name, ``, 0, {
        key: envName,
        value,
        ok: true,
      });
    } catch (err) {
      return successMsg(this.name, ``, 0, {
        key: envName,
        value: null,
        ok: false,
        error: err.message,
      });
    }
  }
});
export const isSameDay = selfWrap(async function isSameDay(dateA, dateB) {
  return formatDate(dateA) === formatDate(dateB);
});
export const newToken = selfWrap(async function newToken(length = 16) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
});
export const toBase64 = selfWrap(async function toBase64(string) {
  return Buffer.from(string, 'utf-8').toString('base64');
});
export const fromBase64 = selfWrap(async function fromBase64(string) {
  return Buffer.from(string, 'base64').toString('utf-8');
});
export const toBinary = selfWrap(async function toBinary(number) {
  return number.toString(2);
});
export const fromBinary = selfWrap(async function fromBinary(string) {
  return parseInt(string, 2);
});
export const toRoman = selfWrap(async function toRoman(number) {
  if (typeof number !== 'number' || number <= 0) return '';
  const romanMap = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let s = '';
  for (const [value, numeral] of romanMap) {
    while (number >= value) {
      s += numeral;
      number -= value;
    }
  }
  return s;
});
export const fromRoman = selfWrap(async function fromRoman(roman) {
  if (typeof roman !== 'string' || roman.length === 0) return 0;
  const romanMap = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let total = 0,
    prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const curr = romanMap[roman[i].toUpperCase()] || 0;
    if (curr < prev) total -= curr;
    else total += curr;
    prev = curr;
  }
  return total;
});
export const toSlug = selfWrap(async function toSlug(string) {
  const result = string
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return result;
});
export const findAllObjectByValue = selfWrap(async function findAllObjectByValue(obj, value) {
  return Object.keys(obj).filter(k => obj[k] === value);
});
export const findAllArrayByValue = selfWrap(async function findAllArrayByValue(arr, key, value) {
  if (!Array.isArray(arr)) throwError('[-] First argument must be an array.');
  return arr.filter(item => item?.[key] === value);
});
export const deepFindAllObjectKeyPaths = selfWrap(async function deepFindAllObjectKeyPaths(obj, targetKey) {
  const results = [];
  const search = (current, path = []) => {
    if (typeof current !== 'object' || current === null) return;
    for (const key in current) {
      const newPath = [...path, key];
      if (key === targetKey) {
        results.push({
          path: newPath.join('.'),
          value: current[key],
        });
      }
      search(current[key], newPath);
    }
  };
  search(obj);
  return results;
});
export const unicode = selfWrap(async function unicode(str) {
  return [...str].map(char => `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} (${char})`).join('\n');
});
export const wait = selfWrap(async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
});
export const convertImageToBase64 = selfWrap(async function convertImageToBase64(url) {
  if (!url)
    return errorMsg(this.name, `No URL provided.`, 0, {
      base64: null,
    });
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const sizeLimit = 10 * 1024 * 1024;
  const contentLength = Number(res.headers.get('content-length')) || buf.length;
  if (contentLength > sizeLimit)
    return errorMsg(this.name, `Image too large.`, 0, { base64: null });
  const resized = await sharp(buf).resize({ width: 512, height: 512, fit: 'inside' }).png().toBuffer();
  const base64 = resized.toString('base64');
  return successMsg(this.name, ``, 0, {
    base64: `data:image/png;base64,${base64}`,
  });
});
export const convertColorToHex = selfWrap(async function convertColorToHex(input) {
  try {
    return Color(input).hex().toLowerCase();
  } catch {
    return '#000000';
  }
});
export const isSafeNumber = selfWrap(async function isSafeNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER;
});
export const chalk = selfWrap(async function chalk(text, color = 'white') {
  if (!chalkLib[color]) color = 'white';
  return chalkLib[color](text);
});
export const gradientMsg = selfWrap(async function gradientMsg(msg, opts = {}) {
  const {
    type = "info",          // "info" | "error" | "success" | "custom"
    colors = [[0, 0, 255], [0, 255, 255]], // gradient stops as [r,g,b]
    gradient = false,       // toggle gradient on/off
    timestamp = false,      // prepend [HH:MM:SS]
  } = opts;
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const str = typeof msg === "object" ? JSON.stringify(msg, null, 2) : String(msg);
  let out = str;
  if (gradient && colors.length > 1) {
    const chars = Array.from(str);
    const len = chars.length;
    const segs = colors.length - 1;
    out = chars
      .map((ch, i) => {
        const t = (i / (len - 1)) * segs;
        const seg = Math.min(Math.floor(t), segs - 1);
        const localT = t - seg;
        const [r1, g1, b1] = colors[seg];
        const [r2, g2, b2] = colors[seg + 1];
        const r = clamp(r1 + (r2 - r1) * localT);
        const g = clamp(g1 + (g2 - g1) * localT);
        const b = clamp(b1 + (b2 - b1) * localT);
        return chalk.rgb(r, g, b)(ch);
      })
      .join("");
  } else {
    if (type === "error") out = chalk.red(str);
    else if (type === "success") out = chalk.green(str);
    else if (type === "info") out = chalk.blue(str);
    else out = chalk.white(str);
  }
  if (timestamp) {
    const now = new Date().toLocaleTimeString("en-GB");
    out = `[${now}] ${out}`;
  }
  return out;
});

export const waitForMessages = selfWrap(async function waitForMessages(channel, userId, options = {}) {
  const { steps, timeout = 30000, stepTimeout = 15000, prompt = [], validate = [], ephemeral = true, interaction = null, boldError = true } = options;
  if (!channel || !userId) throwError('[-] waitForMessages: missing channel or userId.');
  if (!Array.isArray(steps) || steps.length === 0) throwError("[-] waitForMessages: 'steps' must be a non-empty array.");
  const user = await channel.client.users.fetch(userId);
  const res = [],
    start = Date.now();
  for (let i = 0; i < steps.length; i++) {
    if (Date.now() - start > timeout) throwError(`${this.name}`, `total timeout (${timeout}ms) at step ${i + 1}.`);
    if (prompt[i]) {
      const p = prompt[i];
      channel.type === 1 || channel.type === 'DM' ? await user.send(p) : await channel.send(p);
    }
    const msg = await new Promise((resolve, reject) => {
      const f = m => m.author.id === userId;
      const c = channel.createMessageCollector({ filter: f, time: stepTimeout });
      c.on('collect', async m => {
        const match = steps[i] === '*' || m.content === steps[i];
        const valid = typeof validate[i] === 'function' ? validate[i](m.content) : true;
        if (!match || !valid) {
          const reason = !match ? 'unexpected content' : 'validation failed';
          const msg = boldError ? `❌ **Invalid input** for step **${i + 1}**.` : `❌ Invalid input at step ${i + 1}.`;
          interaction?.followUp?.({ content: msg, ephemeral }).catch(() => {});
          channel.send?.(msg).catch(() => {});
          c.stop();
          reject(new Error(`[-] waitForMessages: step ${i + 1} failed - ${reason}.`));
        } else {
          c.stop();
          resolve(m);
        }
      });
      c.on('end', (_, r) => r !== 'user' && reject(new Error(`[-] waitForMessages: step ${i + 1} timed out after ${stepTimeout}ms.`)));
    });
    res.push(msg);
  }
  return res;
});
export const flagMap = {
  crossposted: 1 << 0,
  isCrosspost: 1 << 1,
  suppressEmbeds: 1 << 2,
  sourceMessageDeleted: 1 << 3,
  urgent: 1 << 4,
  hasThread: 1 << 5,
  ephemeral: 1 << 6,
  loading: 1 << 7,
  failedToMentionSomeRolesInThread: 1 << 8,
  suppressNotifications: 1 << 12,
  isVoiceMessage: 1 << 13,
};
export const parseFlags = selfWrap(async function parseFlags(opts) {
  let flags = 0;
  for (const k in opts) if (opts[k] && flagMap[k]) flags |= flagMap[k];
  return flags;
});
export const formatFlags = selfWrap(async function formatFlags(bitfield) {
  const out = {};
  for (const k in flagMap) out[k] = (bitfield & flagMap[k]) !== 0;
  return out;
});
export const runCommand = selfWrap(async function runCommand(bot, message, content) {
  if (message.author.bot) return;
  if (!bot) throwError(`${this.name}`, `Expected bot parameter (${bot}).`);
  bot.emit('messageCreate', {
    ...message,
    content,
    author: message.author,
  });
});

export const Schedule = selfWrap(async function Schedule() {
  try {
    const response = await fetch('https://drednot.io/pvp-events', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throwError(this.name, `Network response was not ok ${response.statusText}`);
    const body = await response.text();
    const scriptTag = body.match(/<script[^>]*>(.*?)<\/script>/g).find(script => script.includes('SCHEDULE='));
    schedule = JSON.parse(
      scriptTag
        .replace(/<script[^>]*>|<\/script>/g, '')
        .trim()
        .replace('SCHEDULE=', '')
    );
  } catch (error) {
    throwError(this.name, `Error fetching schedule: ${error.stack || error.message || error}`);
  }
});
Schedule();
export const pvpEvent = selfWrap(async function pvpEvent(type) {
  await Schedule();
  await wait(2555);
  if (typeof type === 'object') type = JSON.stringify(type);
  else if (Array.isArray(type)) type = type.join(' ');
  if (typeof type === 'string') type = type.toLowerCase();
  const now = new Date();
  const Week = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if (type === 'all') return schedule.map(({ date }) => ({ date }));
  if (type === 'today') {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayEvents = schedule.filter(({ date }) => {
      const eventDate = new Date(date).setHours(0, 0, 0, 0);
      return eventDate === today;
    });
    return todayEvents.length ? todayEvents.map(({ date }) => date) : Error('No events for today.');
  }
  if (['next', 'second', 'third', 'four'].includes(type)) {
    const upcoming = schedule.filter(({ date }) => new Date(date) > now).sort((a, b) => new Date(a.date) - new Date(b.date));
    const index = type === 'next' ? 0 : type === 'second' ? 1 : type === 'third' ? 2 : 3;
    return upcoming[index] ? upcoming[index].date : Error('No upcoming events.');
  }
  if (Week.includes(type)) {
    const dayEvents = schedule.filter(({ date }) => new Date(date).getDay() === Week.indexOf(type));
    return dayEvents.length ? dayEvents.map(({ date }) => date) : Error(`No events found for ${type}`);
  }
  const dayEvents = schedule.filter(({ date }) => date === type);
  dayEvents.length ? dayEvents.map(({ date }) => date) : Error(`No events found for ${type}`);
});

export const newTab = selfWrap(async function newTab(shipId) {
  if (!shipId) throwError(this.name, `unexpected shipId "${shipId}".`);
  const data = await readData(paths.database.active_ship);
  if (!Array.isArray(data)) throwError(this.name, 'active_ship data is not an array!');
  if (data.includes(shipId)) throwError(this.name, `Ship "${shipId}" already exists.`);
  data.push(shipId);
  await writeData(paths.database.active_ship, data);
});
export const removeTab = selfWrap(async function removeTab(shipId) {
  if (!shipId) throwError(this.name, `unexpected shipId "${shipId}".`);
  const data = await readData(paths.database.active_ship);
  if (!Array.isArray(data)) throwError(this.name, 'active_ship data is not an array!');
  const index = data.indexOf(shipId);
  if (index === -1) throwError(this.name, `Ship "${shipId}" does not exist.`);
  data.splice(index, 1);
  await writeData(paths.database.active_ship, data);
});
export const findTab = selfWrap(async function findTab(shipId) {
  if (!shipId) throwError(this.name, `unexpected shipId "${shipId}".`);
  const data = await readData(paths.database.active_ship);
  if (!Array.isArray(data)) throwError(this.name, 'active_ship data is not an array!');
  return data.includes(shipId);
});
export const fetchShipList = selfWrap(async function fetchShipList() {
  try {
    const res = await fetch('https://drednot.io/shiplist?server=0', {
      headers: {
        Cookie: `anon_key=${config.DREDNOT_ANON_KEY}`,
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!res.ok) {
      log(`[fetchShipList]: HTTP ${res.status}`, 'error');
      return null;
    }
    const json = await res.json();
    if (!json.ships) {
      log('[fetchShipList]: No ships key in response', 'error');
      return null;
    }
    return json;
  } catch (err) {
    log(`[fetchShipList]: fetch error: ${err.message}`, 'error');
    return null;
  }
});
export const fetchShipFromLink = selfWrap(async function fetchShipFromLink(link) {
  try {
    const res = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Cookie: `anon_key=${config.DREDNOT_ANON_KEY}`,
      },
    });
    if (!res.ok) return errorMsg(this.name, ``, 0);
    const html = await res.text();
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || null;
    const shipName = ogTitle
      .replace(/^(Invite:|Ship:)\s*/, '')
      .replace(/\s*[-|]\s*drednot\.io$/i, '')
      .trim();
    if (!shipName || shipName === 'Deep Space Airships') return errorMsg(this.name, ``, 0);
    return successMsg(this.name, ``, 0, {
      shipName,
      shipImage: ogImage,
    });
  } catch {
    return errorMsg(this.name, ``, 0);
  }
});
export const drawShipsCard = selfWrap(async function drawShipsCard(ships, updateInterval, totalPlayers, maxPlayers) {
  const width = 900;
  const padding = 20;
  const maxHeight = 2000;
  const defaultBoxHeight = 120;
  const totalContentHeight = ships.length * (defaultBoxHeight + padding) + 100;
  let boxHeight = defaultBoxHeight;
  if (totalContentHeight > maxHeight) boxHeight = Math.floor((maxHeight - 100 - ships.length * padding) / ships.length);
  const canvasHeight = Math.min(maxHeight, totalContentHeight);
  const canvas = createCanvas(width, canvasHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, canvasHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('All Ships Online', width / 2, 50);
  if (updateInterval) {
    ctx.textAlign = 'left';
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Updates every ${updateInterval}s`, padding, 30);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const iconSize = Math.min(boxHeight * 0.75, 90);
  for (let i = 0; i < ships.length; i++) {
    const ship = ships[i];
    const y = 80 + i * (boxHeight + padding);
    const radius = Math.min(20, boxHeight / 2);
    const [r, g, b] = ship.color.match(/\d+/g).map(Number);
    const gradient = ctx.createLinearGradient(padding, y, width - padding, y + boxHeight);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0.6)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding + radius, y);
    ctx.lineTo(width - padding - radius, y);
    ctx.quadraticCurveTo(width - padding, y, width - padding, y + radius);
    ctx.lineTo(width - padding, y + boxHeight - radius);
    ctx.quadraticCurveTo(width - padding, y + boxHeight, width - padding - radius, y + boxHeight);
    ctx.lineTo(padding + radius, y + boxHeight);
    ctx.quadraticCurveTo(padding, y + boxHeight, padding, y + boxHeight - radius);
    ctx.lineTo(padding, y + radius);
    ctx.quadraticCurveTo(padding, y, padding + radius, y);
    ctx.closePath();
    ctx.fill();
    const iconX = padding + iconSize / 2;
    const iconY = y + boxHeight / 2;
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    if (ship.icon_path) {
      try {
        const icon = await loadImage(ship.icon_path);
        ctx.save();
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(icon, padding, y + (boxHeight - iconSize) / 2, iconSize, iconSize);
        ctx.restore();
      } catch {}
    }
    const textX = padding + iconSize + 30;
    const textWidth = width - textX - padding;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(textX - 10, y + 10, textWidth, boxHeight - 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(boxHeight / 4)}px sans-serif`;
    ctx.fillText(`[${ship.ourId}] ${ship.team_name}`, textX, y + boxHeight / 3);
    ctx.font = `${Math.floor(boxHeight / 6)}px sans-serif`;
    ctx.fillText(`Players: ${ship.player_count}`, textX, y + (2 * boxHeight) / 3);
    ctx.font = `${Math.floor(boxHeight / 8)}px sans-serif`;
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`ShipID: ${ship.ship_id}`, textX, y + boxHeight - 20);
  }
  return canvas;
});

export const getMissionState = selfWrap(async function getMissionState() {
  const openDur = config.MISSION_CLOSE_DURATION;
  const closeDur = config.MISSION_OPEN_DURATION;
  const cycle = openDur + closeDur;
  const firstOpenTs = config.MISSION_START_TS;
  const now = Math.floor(Date.now() / 1000);
  if (now < firstOpenTs) {
    const t = firstOpenTs - now;
    return successMsg(this.name, "", 0, {
      state: "CLOSED",
      timeLeft: t,
      nextChange: firstOpenTs
    });
  }
  const elapsed = Math.max(0, (now - firstOpenTs) % cycle);
  if (elapsed < openDur) {
    const t = Math.max(0, openDur - elapsed);
    return successMsg(this.name, "", 0, {
      state: "OPEN",
      timeLeft: t,
      nextChange: now + t
    });
  }
  const t = Math.max(0, cycle - elapsed);
  return successMsg(this.name, "", 0, {
    state: "CLOSED",
    timeLeft: t,
    nextChange: now + t
  });
});
export const getFutureMission = selfWrap(async function getFutureMission(count = 3) {
  const openDur = config.MISSION_CLOSE_DURATION;
  const closeDur = config.MISSION_OPEN_DURATION;
  const cycle = openDur + closeDur;
  const firstOpenTs = config.MISSION_START_TS;
  const now = Math.floor(Date.now() / 1000);
  const cyclesPassed = Math.floor(Math.max(0, (now - firstOpenTs) / cycle));
  let t = firstOpenTs + cyclesPassed * cycle;
  if (t <= now) t += cycle;
  const list = [];
  for (let i = 0; i < count; i++) {
    const o = t + i * cycle;
    const c = o + openDur;
    list.push({ open: o, close: c });
  }
  return list;
});

export const getDrednotLeaderboard = selfWrap(async function getDrednotLeaderboard(category, by = 'pilot', page = 1, formatter = 'formatDrednotLeaderboard') {
  const Map = {
    archives: 'archive', archived: 'archive', 'archived categories ⇒': 'archive', 'old categories': 'archive', 'past categories': 'archive', history: 'archive',
    bots: 'bots', bot: 'bots', 'bot kills': 'bots', 'regular pve bots': 'bots', 'regular bot kills': 'bots', 'pve bots': 'bots',
    coward: 'boss_coward', 'coward kills': 'boss_coward', 'coward pve': 'boss_coward', 'coward boss': 'boss_coward',
    lazer: 'boss_lazer', 'lazer kills': 'boss_lazer', 'lazer pve': 'boss_lazer', laser: 'boss_lazer', 'laser kills': 'boss_lazer',
    shield: 'boss_shield', 'shield kills': 'boss_shield', 'shield pve': 'boss_shield', 'shield boss': 'boss_shield',
    'pvp wins': 'pvp_elimination_wins', 'pvp win': 'pvp_elimination_wins', 'pvp elim wins': 'pvp_elimination_wins', 'pvp: elimination wins': 'pvp_elimination_wins', 'pvp elimination': 'pvp_elimination_wins',
    'pvp loot': 'pvp_elimination_loot', 'pvp loot elim': 'pvp_elimination_loot', 'pvp: elimination loot': 'pvp_elimination_loot', 'pvp elim loot': 'pvp_elimination_loot', loot: 'pvp_elimination_loot', 'loot wins': 'pvp_elimination_loot'
  };
  const cat = Map[category?.toLowerCase()];
  if (!cat) return errorMsg(this.name, `Invalid category.`, 0);
  const statusPath = paths.database.scrape_do;
  const cachePath = paths.database.leaderboardCache;
  const cacheKey = `${cat}_${by}_${page}`;
  let state = {}, cache = {};
  try { state = JSON.parse(await fs.readFile(statusPath, 'utf-8')); } 
  catch { state = { started: Date.now(), resetAt: Date.now() + 32*24*60*60*1000, used: 0, limit: 1000, fetch: 0, success: 0, errors: 0, lastFetch: null, next: null, avgIntervalMs: null, remaining: 1000 }; }
  try { cache = JSON.parse(await fs.readFile(cachePath, 'utf-8')); } 
  catch { cache = {}; }
  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < 24*60*60*1000) return cache[cacheKey].data;
  if (Date.now() > state.resetAt) state = { started: Date.now(), resetAt: Date.now() + 32*24*60*60*1000, used: 0, limit: 1000, fetch: 0, success: 0, errors: 0, lastFetch: null, next: null, avgIntervalMs: null, remaining: 1000 };
  if (state.next && Date.now() < state.next) return errorMsg(this.name, `Rate limited. Try again in ${formatTime(state.next - Date.now())}.`, 0);
  if (state.used + 5 > state.limit) return successMsg(this.name, `API credit limit reached.`, 0);
  const proxy = `https://api.scrape.do/?token=${readEnv('SCRAPE_DO_API_KEY')}&url=${encodeURIComponent(`https://drednot.io/leaderboard?cat=${cat}&by=${by}&p=${page}`)}&render=true`;
  try {
    const res = await fetch(proxy);
    const html = await res.text();
    state.fetch++;
    state.used += 5;
    state.success++;
    state.lastFetch = Date.now();
    state.remaining = state.limit - state.used;
    state.avgIntervalMs = Math.round((state.lastFetch - state.started) / state.fetch) || 0;
    const now = Date.now();
    state.next = now + (state.used >= state.limit ? 60000 : 0);
    const out = { ok: true, ts: Date.now(), page, category: cat, by, cred: `${state.used}/${state.limit}`, remaining: state.remaining, html };
    cache[cacheKey] = { ts: Date.now(), data: out };
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
    await fs.writeFile(statusPath, JSON.stringify(state, null, 2));
    if (formatter === 'formatDrednotLeaderboard') return formatDrednotLeaderboard(out, by);
    if (typeof formatter === 'function') return formatter(out, by);
    return out;
  } catch (e) {
    state.errors++;
    await fs.writeFile(statusPath, JSON.stringify(state, null, 2));
    return errorMsg(this.name, e.message, 0);
  }
});
export const formatDrednotLeaderboard = selfWrap(async function formatDrednotLeaderboard(data, by = 'pilot') {
  if (!data.ok)
    return errorMsg(this.name, data.err, 0);
  const $ = cheerio.load(data.html);
  const rows = $('table.leaderboard tr');
  const leaderboard = {};
  rows.each((i, row) => {
    const cells = $(row).find('td');
    if (!cells.length) return;
    const rank = $(cells[0]).text().trim();
    const entry = {
      rank,
      name: $(cells[1]).text().trim(),
      score: $(cells[2]).text().trim(),
    };
    if (by.toLowerCase() === 'ship') entry.shipScore = $(cells[3])?.text().trim() || null;
    leaderboard[rank] = entry;
  });
  return successMsg(this.name, ``, 0, {
    meta: {
      timestamp: new Date(data.ts).toLocaleString(),
      page: data.page,
      category: data.category,
      by: data.by,
      credsUsed: data.cred,
      remainingCreds: data.remaining,
      fetchPerMinute: data.fetchPerMin,
      fetchPerDay: data.fetchPerDay,
      nextFetchAt: new Date(data.nextAt).toLocaleString(),
    },
    leaderboard,
  });
});

export const getSpotifyToken = selfWrap(async function getSpotifyToken() {
  const accessToken = await readEnv('SPOTIFY_ACCESS_TOKEN');
  const expiresIn = Number(await readEnv('SPOTIFY_EXPIRES_IN'));
  const obtainedAt = Number(await readEnv('SPOTIFY_OBTAINED_AT'));
  if (!accessToken || !expiresIn || !obtainedAt || Date.now() > obtainedAt + (expiresIn - 60) * 1000) return await refreshSpotifyToken();
  return accessToken;
});
export const refreshSpotifyToken = selfWrap(async function refreshSpotifyToken() {
  const refreshToken = await readEnv('SPOTIFY_REFRESH_TOKEN');
  const clientId = await readEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = await readEnv('SPOTIFY_CLIENT_ID_SECRET');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!data.access_token) throwError('[-] Failed to refresh Spotify token');
  await writeEnv('SPOTIFY_ACCESS_TOKEN', data.access_token);
  await writeEnv('SPOTIFY_EXPIRES_IN', String(data.expires_in));
  await writeEnv('SPOTIFY_OBTAINED_AT', String(Date.now()));
  return data.access_token;
});
export const searchSpotify = selfWrap(async function searchSpotify(songName, artistName = '', limit = 1) {
  const token = await getSpotifyToken();
  let q = songName;
  if (!q) throwError('[-] songName is required.');
  if (artistName) q += ` artist:${artistName}`;
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.tracks || !data.tracks.items.length) return [];
  return data.tracks.items;
});
export const resolveDependencies = selfWrap(async function resolveDependencies(depStr, message) {
  if (typeof depStr !== 'string' || !depStr.trim()) return {};
  const dep = {};
  const topLevelDeps = {
    helper,
    config,
    message,
    clan,
    commandUsage,
    commandComponent,
    marketplace,
    paths,
    deleteSchedule,
    trade,
    getcommand
  };
  const fallbackModules = [
    config, helper, clan,
    commandUsage, commandComponent,
    marketplace, getcommand, 
    deleteSchedule, trade
  ];
  const resolvePath = (obj, path) => {
    return path.split('.').reduce((o, key) => (o?.[key] !== undefined ? o[key] : undefined), obj);
  };
  for (const rawName of depStr.trim().split(/\s+/)) {
    const [moduleName, ...nestedPath] = rawName.split('.');
    let value;
    if (topLevelDeps[moduleName]) value = nestedPath.length ? resolvePath(topLevelDeps[moduleName], nestedPath.join('.')) : topLevelDeps[moduleName];
    if (value === undefined) {
      for (const mod of fallbackModules) {
        value = resolvePath(mod, rawName);
        if (value !== undefined) break;
      }
    }
    if (value === undefined) throwError(`${this.name}`, `Unknown dependency '${rawName}'`);
    dep[rawName] = value;
  }
  return dep;
});

export const getLocalIP = selfWrap(async function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    if (interfaces.hasOwnProperty(interfaceName)) {
      const addresses = interfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal) return address.address;
      }
    }
  }
  return null;
});
export const getProxyUrl = selfWrap(async function getProxyUrl() {
  return config.PROXY_URL || null;
});
export const getNgrokUrl = selfWrap(async function getNgrokUrl() {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (!res.ok) throwError('Failed to fetch ngrok tunnel info.');
    const data = await res.json();
    const tunnel = data.tunnels.find(t => t.proto === 'https') || data.tunnels[0];
    return tunnel?.public_url || null;
  } catch (err) {
    log(`[-] getNgrokUrl: ${err}`);
    return 'No data.';
  }
});

export const getTax = selfWrap(async function getTax(amount = 0, user) {
  if (config.TAX === false) return 0;
  let rate = typeof config.TAX === 'number' ? config.TAX : 15;
  if (user) {
    const boost = await listSkillBoost(user, 'tax');
    if (boost.ignoreTax) return 0;
    if (typeof boost.ignoreTaxPercent === 'number') rate = rate * (1 - boost.ignoreTaxPercent);
  }
  return Math.floor(amount * (rate / 100));
});

export const initUserObject = selfWrap(async function initUserObject(user) {
  let data = await loadData(user);
  if (typeof data !== "object" || data === null) data = {};
  const added = [];
  const repaired = [];
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  const delPath = (obj, path) => {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((o, k) => (o ? o[k] : undefined), obj);
    if (parent && last in parent) delete parent[last];
  };
  const migrate = (srcPath, dstPath) => {
    const val = getPath(data, srcPath);
    if (val !== undefined) {
      const keys = dstPath.split(".");
      let cur = data;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] = cur[keys[i]] || {};
      if (!cur[keys.at(-1)]) cur[keys.at(-1)] = val;
      delPath(data, srcPath);
      repaired.push(`${srcPath}→${dstPath}`);
    }
  };
  const ensure = (obj, key, def = {}) => {
    if (typeof obj[key] !== "object" || obj[key] === null) {
      obj[key] = def;
      added.push(key);
    }
    return obj[key];
  };
  const setDefault = (obj, key, def, condition = null) => {
    if (obj[key] === undefined) {
      obj[key] = def;
      added.push(key);
    } else if (obj[key] === null) {
      obj[key] = def;
      repaired.push(key);
    } else if (typeof condition === "function" && !condition(obj[key])) {
      obj[key] = def;
      repaired.push(key);
    }
  };

  migrate("daily", "streak.daily");
  migrate("weekly", "streak.weekly");
  migrate("monthly", "streak.monthly");
  migrate("yearly", "streak.yearly");
  migrate("account.daily", "streak.daily");

  const balance = ensure(data, "balance");
  setDefault(balance, "dredcoin", 0);

  setDefault(data, "username", user, (v) => typeof v === "string" && v.length > 0);

  const exp = ensure(data, "exp");
  setDefault(exp, "exp", 0);
  setDefault(exp, "lv", 1);
  setDefault(exp, "expNeeded", getExpNeeded(exp.lv));

  setDefault(data, "command_executed", 1);
  setDefault(data, "Permission", []);
  if (typeof data.Permission === "string" || !Array.isArray(data.Permission)) {
    data.Permission = await normalizePerms(data.Permission);
    repaired.push("Permission (normalized)");
  }
  setDefault(data, "blackjack", false);
  setDefault(data, "multibet", false);
  setDefault(data, "hilo", false);
  setDefault(data, "onlyup", false);
  setDefault(data, "dice", false);

  const onlyupHistory = ensure(data, "onlyupHistory");
  setDefault(onlyupHistory, "count", 0);
  setDefault(onlyupHistory, "lastReset", Date.now());

  const account = ensure(data, "account");
  setDefault(account, "status", "N-Logged-in");
  setDefault(account, "pendingLogin", {});
  setDefault(account, "securityLogs", []);
  setDefault(account, "blockedIP", []);
  setDefault(account, "password", account.password && account.password.startsWith("$argon2") ? account.password : (await hashPassword(account.password || (await genPassword()).password)));

  const streak = ensure(data, "streak");
  const daily = ensure(streak, "daily");
  setDefault(daily, "streak", 0);
  setDefault(daily, "lastClaim", Date.now(), (v) => v <= Date.now() || v >= Date.now());
  const weekly = ensure(streak, "weekly");
  setDefault(weekly, "streak", 0);
  setDefault(weekly, "lastClaim", Date.now(), (v) => v <= Date.now() || v >= Date.now());
  const monthly = ensure(streak, "monthly");
  setDefault(monthly, "streak", 0);
  setDefault(monthly, "lastClaim", Date.now(), (v) => v <= Date.now() || v >= Date.now());
  const yearly = ensure(streak, "yearly");
  setDefault(yearly, "streak", 0);
  setDefault(yearly, "lastClaim", Date.now(), (v) => v <= Date.now() || v >= Date.now());

  setDefault(data, "dailyQuests", {});
  setDefault(data, "weeklyQuests", {});
  setDefault(data, "monthlyQuests", {});
  setDefault(data, "yearlyQuests", {});

  setDefault(data, "equipment", {});

  const bank = ensure(data, "bank");
  setDefault(bank, "balance", 0);

  const passiveIncome = ensure(data, "passiveIncome");
  setDefault(passiveIncome, "lastClaimed", Date.now(), (v) => (v <= Date.now() || v >= Date.now()));

  const multiplier = ensure(data, "multiplier");
  setDefault(multiplier, "exp", 1);
  setDefault(multiplier, "dredcoin", 1);

  setDefault(data, "prestige", 0);
  setDefault(data, "inventory", {});

  const boost = ensure(data, "boost");
  ensure(boost, "cooldown");
  ensure(boost, "passiveIncome");
  setDefault(boost, "dredcoin", []);

  const skills = ensure(data, "skills");
  setDefault(skills, "skills", {});
  setDefault(skills, "rerollable", false);

  const researchs = ensure(data, "research");
  setDefault(researchs, "complete", []);
  setDefault(researchs, "queue", []);
  setDefault(researchs, "unlock", false);

  setDefault(data, "achievement", {});

  const quests = ensure(data, "quests");
  setDefault(quests, "active", []);
  setDefault(quests, "complete", []);

  setDefault(data, "globalCooldown", {});

  setDefault(data, "stat", {});

  setDefault(data, "craftingTask", {});
  setDefault(data, "cookingTask", {});
  setDefault(data, "meltingTask", {});

  setDefault(data, "hatching", {});

  await saveData(user, data);
  return successMsg(this.name, ``, 0, { 
    user, added, repaired 
  });
});

export const isValidBlueprint = selfWrap(async function isValidBlueprint(bpStr) {
  try {
    const bp = await decode(bpStr);
    if (!bp.commands || !bp.commands.length)
      return errormsg(this.name, `No commands.`, 0);
    for (const cmd of bp.commands) {
      if (cmd instanceof BuildCmd && Item[cmd.item] === undefined)
        return successMsg(this.name, `Invalid item: ${cmd.item}.`, 0);
    }
    return successMsg(this.name, ``, 0);
  } catch (err) {
    return errorMsg(this.name, `decode error:\n${err}`, 0);
  }
});
export const bluePrintCountMaterials = selfWrap(async function bluePrintCountMaterials(bpStr) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`bluePrintCountMaterials`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const counts = {};
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd) {
      const k = Item[cmd.item];
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  return successMsg(this.name, ``, {
    counts,
  });
});
export const bluePrintReplaceMaterial = selfWrap(async function bluePrintReplaceMaterial(bpStr, fromItem, toItem) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`bluePrintReplaceMaterial`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd && cmd.item === fromItem) {
      cmd.item = toItem;
    }
  }
  const encoded = await encode(bp);
  return `DSA:${encoded}`;
});
export const blueprintListMaterials = selfWrap(async function blueprintListMaterials(bpStr) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`listMaterials`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const set = new Set();
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd) {
      set.add(Item[cmd.item]);
    }
  }
  return [...set];
});
export const bluePrintRemoveMaterial = selfWrap(async function bluePrintRemoveMaterial(bpStr, targetItem) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`bluePrintRemoveMaterial`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  bp.commands = bp.commands.filter(cmd => !(cmd instanceof BuildCmd && cmd.item === targetItem));
  return 'DSA:' + (await encode(bp));
});
export const blueprintMostUsedMaterial = selfWrap(async function blueprintMostUsedMaterial(bpStr) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`blueprintMostUsedMaterial`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const counts = {};
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd) {
      const key = Item[cmd.item];
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  let maxMat = null,
    maxCount = 0;
  for (const [mat, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxMat = mat;
    }
  }
  return successMsg(this.name, ``, {
    material: maxMat,
    count: maxCount,
  });
});
export const blueprintPreview = selfWrap(async function blueprintPreview(bpStr, y = 0) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`blueprintPreview`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const grid = {};
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd && cmd.pos.y === y) {
      const full = Item[cmd.item];
      const abbr = full
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase();
      const key = `${cmd.pos.x},${cmd.pos.z}`;
      grid[key] = abbr;
    }
  }
  const xs = [...new Set(Object.keys(grid).map(k => parseInt(k.split(',')[0])))];
  const zs = [...new Set(Object.keys(grid).map(k => parseInt(k.split(',')[1])))];
  xs.sort((a, b) => a - b);
  zs.sort((a, b) => a - b);
  let out = '';
  for (const z of zs) {
    let row = '';
    for (const x of xs) row += (grid[`${x},${z}`] || '..').padEnd(3, ' ');
    out += row + '\n';
  }
  return out.trim();
});
export const blueprintCountCmdTypes = selfWrap(async function blueprintCountCmdTypes(bpStr) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`blueprintCountCmdTypes`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const out = { build: 0, erase: 0, message: 0, other: 0 };
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd) out.build++;
    else if (cmd instanceof EraseCmd) out.erase++;
    else if (cmd instanceof MsgCmd) out.message++;
    else out.other++;
  }
  return out;
});
export const blueprintResourceCost = selfWrap(async function blueprintResourceCost(bpStr) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`blueprintResourceCost`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const map = {};
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd) map[Item[cmd.item]] = (map[Item[cmd.item]] || 0) + 1;
  }
  return map;
});
export const bluePrintRandomizeItems = selfWrap(async function bluePrintRandomizeItems(bpStr) {
  const isValid = (await isValidBlueprint(bpStr)).valid;
  if (!isValid) return errorMsg(`bluePrintRandomizeItems`, `Invalid blueprint.`);
  const bp = await decode(bpStr);
  const itemList = Object.keys(Item).filter(k => !isNaN(Item[k]));
  for (const cmd of bp.commands) {
    if (cmd instanceof BuildCmd) {
      const rand = itemList[Math.floor(randomNumber(0, itemList.length))];
      cmd.item = Item[rand];
    }
  }
  return 'DSA:' + (await encode(bp));
});
export const blueprintCompare = selfWrap(async function blueprintCompare(bpStr1, bpStr2) {
  const isValid1 = (await isValidBlueprint(bpStr1)).valid;
  const isValid2 = (await isValidBlueprint(bpStr2)).valid;
  if (!isValid1) return errorMsg(`compareBlueprints`, `First blueprint is invalid.`);
  if (!isValid2) return errorMsg(`compareBlueprints`, `Second blueprint is invalid.`);
  if (bpStr1 === bpStr2)
    return successMsg(this.name, ``, {
      added: [],
      removed: [],
      changed: [],
    });
  const bp1 = await decode(bpStr1);
  const bp2 = await decode(bpStr2);
  const map1 = new Map();
  const map2 = new Map();
  const key = cmd => `${cmd.pos.x},${cmd.pos.y},${cmd.pos.z}`;
  for (const cmd of bp1.commands) {
    if (cmd instanceof BuildCmd) map1.set(key(cmd), cmd.item);
  }
  for (const cmd of bp2.commands) {
    if (cmd instanceof BuildCmd) map2.set(key(cmd), cmd.item);
  }
  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, item2] of map2) {
    if (!map1.has(k)) added.push({ pos: k, item: Item[item2] });
    else if (map1.get(k) !== item2) changed.push({ pos: k, from: Item[map1.get(k)], to: Item[item2] });
  }
  for (const [k, item1] of map1) {
    if (!map2.has(k)) removed.push({ pos: k, item: Item[item1] });
  }
  return successMsg(this.name, ``, {
    added,
    removed,
    changed,
  });
});

export const givePermanentBoost = selfWrap(async function givePermanentBoost(user, { dredcoin = 0, exp = 0 }) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (dredcoin !== 0) data.multiplier.dredcoin += dredcoin;
  if (exp !== 0) data.multiplier.exp += exp;
  await saveData(user, data);
});
export const giveDredcoinBoost = selfWrap(async function giveDredcoinBoost(user, multiplier, duration) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const expiresAt = Date.now() + duration;
  data.boost.dredcoin.push({
    multiplier,
    expiresAt,
  });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    multiplier,
    expiresAt,
  });
});
// with boosts / dredcoin multipliers
export const giveDredcoin = selfWrap(async function giveDredcoin(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount)) throwError(`${this.name}`, `${amount} is not a valid number.`);
  const tax = await getTax(amount, user);
  const taxedAmount = amount - tax;
  const { totalMultiplier: boostMultiplier } = await getActiveBoosts(user, 'dredcoin');
  const skillMultiplierObj = await listSkillBoost(user, 'dredcoin');
  const skillMultiplier = skillMultiplierObj?.total ?? 1;
  const combinedMultiplier = boostMultiplier * skillMultiplier;
  const boostedAmount = Math.floor(taxedAmount * combinedMultiplier);
  let data = await loadData(user);
  if (typeof data.balance.dredcoin !== 'number') data.balance.dredcoin = 0;
  const { max } = await isMaxCoin(user);
  data.balance.dredcoin = Math.min(data.balance.dredcoin + boostedAmount, max || Infinity);
  await saveData(user, data);
  return successMsg(this.name, ``, {
    gave: taxedAmount,
    to: user,
    tax,
    bonus: boostedAmount,
    skillMultiplier,
    boostMultiplier,
    combinedMultiplier,
    newBalance: data.balance.dredcoin,
  });
});
// without boosts / dredcoin multiplier
export const addDredcoin = selfWrap(async function addDredcoin(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount) || amount < 0) throwError(`${this.name}`, `Invalid amount '${amount}'.`);
  let data = await loadData(user);
  if (typeof data.balance.dredcoin !== 'number') data.balance.dredcoin = 0;
  const { max } = await isMaxCoin(user);
  data.balance.dredcoin = Math.min(data.balance.dredcoin + amount, max || Infinity);
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    added: amount,
    newBalance: data.balance.dredcoin,
  });
});
export const removeDredcoin = selfWrap(async function removeDredcoin(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount)) return false;
  const data = await loadData(user);
  const balance = data.balance;
  const current = balance.dredcoin;
  if (current < amount) return false;
  balance.dredcoin = current - amount;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    removed: amount,
    remaining: balance.dredcoin,
    newBalance: balance.dredcoin,
    user,
  });
});
export const setDredcoin = selfWrap(async function setDredcoin(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount)) throwError(`${this.name}`, `${amount} is not a valid number.`);
  const { max } = await isMaxCoin(user);
  const clamped = Math.max(0, Math.min(amount, max));
  const data = await loadData(user);
  const balance = data.balance;
  balance.dredcoin = clamped;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    setTo: clamped,
    max,
    user,
  });
});

export const getDredcoin = selfWrap(async function getDredcoin(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  return data.balance.dredcoin;
});
export const getBankBalance = selfWrap(async function getBankBalance(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  return data.bank.balance;
});

export const applyDredcoinMultiplier = selfWrap(async function applyDredcoinMultiplier(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const applied = amount * data.multiplier.dredcoin * data.prestige;
  return applied;
});
export const applyExpMultiplier = selfWrap(async function applyExpMultiplier(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const applied = amount * data.multiplier.exp * data.prestige;
  return applied;
});

export const isMaxCoin = selfWrap(async function isMaxCoin(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (config.MAX_DREDCOIN === false) {
    return successMsg(this.name, ``, {
      user,
      isMax: false,
      current: data.balance.dredcoin,
      max: Number.MAX_SAFE_INTEGER,
    });
  }
  let maxAmount = config.MAX_DREDCOIN;
  if (typeof maxAmount === 'string') {
    try {
      maxAmount = parseAmount(maxAmount);
    } catch (err) {
      throwError(`${this.name}`, `Failed to parse MAX_DREDCOIN string: ${config.MAX_DREDCOIN}`);
    }
  }
  return successMsg(this.name, ``, {
    user,
    isMax: data.balance.dredcoin >= maxAmount,
    current: data.balance.dredcoin,
    max: maxAmount,
  });
});
export const isMaxBank = selfWrap(async function isMaxBank(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  let maxAmount = config.MAX_BANK;
  if (maxAmount === false) maxAmount = Number.MAX_SAFE_INTEGER;
  else if (typeof maxAmount === 'string') {
    try {
      maxAmount = parseAmount(maxAmount);
    } catch (err) {
      throwError(`${this.name}`, `Failed to parse MAX_BANK string: ${config.MAX_BANK}`);
    }
  }
  return successMsg(this.name, ``, {
    user,
    isMax: data.bank.balance >= maxAmount,
    current: data.bank.balance,
    max: maxAmount,
  });
});
export const isMaxLevel = selfWrap(async function isMaxLevel(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const lv = data?.exp?.lv ?? 0;
  let maxAmount = config.MAX_LEVEL;
  if (maxAmount === false) maxAmount = Number.MAX_SAFE_INTEGER;
  return successMsg(this.name, ``, {
    user,
    isMax: lv >= maxAmount,
    current: lv,
    max: maxAmount,
  });
});

export const getExpNeeded = selfWrap(async function getExpNeeded(level, user) {
  let base = config.EXPNEEDED_BASE || 100;
  let multiplier = 1;
  if (config.EXPNEEDED_MULTIPLIER_AFTER_LEVEL) {
    const levelbase = Object.keys(config.EXPNEEDED_MULTIPLIER_AFTER_LEVEL)
      .map(Number)
      .sort((a, b) => a - b);
    for (const threshold of levelbase) {
      if (level >= threshold) multiplier = config.EXPNEEDED_MULTIPLIER_AFTER_LEVEL[threshold];
    }
  }
  base *= multiplier;
  if (user) {
    const prestige = await getPrestige(user);
    const prestigeScale = 1 + prestige * (config.PRESTIGE_DIFFICULTY_PERCENT / 100);
    const debuff = await listSkillBoost(user, 'expNeededDebuffPercent').total;
    return Math.floor((base * prestigeScale) / debuff);
  }
  return Math.floor(base);
});
export const getUserExpData = selfWrap(async function getUserExpData(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.exp || typeof data.exp !== 'object') data.exp = { lv: 1, exp: 0 };
  if (typeof data.exp.lv !== 'number' || isInteger(data.exp.lv)) data.exp.lv = 1;
  if (typeof data.exp.exp !== 'number' || isInteger(data.exp.exp)) data.exp.exp = 0;
  const level = data.exp.lv;
  const exp = data.exp.exp;
  const prestige = Number.isFinite(data?.prestige) ? data.prestige : 0;
  const Needed = getExpNeeded(level, user);
  const needed = typeof data.exp.expNeeded === 'number' ? data.exp.expNeeded : Needed;
  return successMsg(this.name, ``, {
    user,
    data: {
      lv: data.exp.lv,
      exp: data.exp.exp,
      prestige,
    },
    current: exp,
    Needed,
    level,
    expNeeded: needed,
  });
});
export const canLevelUp = selfWrap(async function canLevelUp(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const { current, level } = await getUserExpData(user);
  let tempLevel = level,
    tempExp = current;
  let count = 0;
  while (tempExp >= getExpNeeded(tempLevel)) {
    if (await isMaxLevel(user).isMax) break;
    tempExp -= getExpNeeded(tempLevel++);
    count++;
  }
  return count > 0 ? count : false;
});
export const forceLevelUp = selfWrap(async function forceLevelUp(user, amount = 1) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) throwError('[-] forceLevelUp: Invalid amount.');
  const { data, current, level: oldLevel, expNeeded: oldExpNeeded } = await getUserExpData(user);
  let level = typeof oldLevel === 'number' && !isInteger(oldLevel) ? oldLevel : 1;
  let exp = typeof current === 'number' && !isInteger(current) ? current : 0;
  const isMax = (await isMaxLevel(user)).isMax;
  const max = (await isMaxLevel(user)).max;
  if (isMax !== Infinity && isMax === true) return `[!] forceLevelUp: ${user} already has the maximum level.`;
  let leveledUp = 0;
  while (amount > 0) {
    if (await isMaxLevel(user).isMax) break;
    level++;
    leveledUp++;
    amount--;
  }
  const bonusLevel = (await listSkillBoost(user, 'bonusLevel').total) || 0;
  if (bonusLevel > 0) {
    level += bonusLevel;
    leveledUp += bonusLevel;
  }
  const bonusLevelPercent = (await listSkillBoost(user, 'bonusLevelPercent').total) || 0;
  if (bonusLevelPercent > 0) {
    const bonusLevels = Math.floor(level * bonusLevelPercent);
    level += bonusLevels;
    leveledUp += bonusLevels;
  }
  if (isMax) level = max;
  const newExpNeeded = await getExpNeeded(level, user);
  data.exp.lv = level;
  data.exp.exp = exp;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    amount,
    type: 'forceLevelUp',
    leveledUp,
    oldLevel,
    oldExp: current,
    oldExpNeeded,
    newLevel: level,
    newExp: exp,
    newExpNeeded,
    exp,
    expNeeded: newExpNeeded,
    reachedMaxLevel: (await isMaxLevel(user)).isMax,
  });
});
export const levelUpIfCan = selfWrap(async function levelUpIfCan(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const levelUps = await canLevelUp(user);
  if (!levelUps)
    return successMsg(this.name, ``, {
      user,
      type: 'levelUpIfCan',
      leveledUp: 0,
    });
  const result = await forceLevelUp(user, levelUps);
  return successMsg(this.name, ``, {
    user,
    type: 'levelUpIfCan',
    ...result,
  });
});
export const giveExp = selfWrap(async function giveExp(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.exp || typeof data.exp !== 'object') data.exp = { lv: 1, exp: 0 };
  const oldLevel = data.exp.lv;
  const oldExp = data.exp.exp;
  const isMax = (await isMaxLevel(user)).isMax;
  const { totalMultiplier } = await getActiveBoosts(user, 'exp');
  let appliedAmount = Math.floor(amount * totalMultiplier);
  const bonusExp = await listSkillBoost(user, 'expBonus').total;
  appliedAmount += bonusExp;
  let level = oldLevel;
  let exp = oldExp + appliedAmount;
  let reachedMaxLevel = false;
  while (exp >= (await getExpNeeded(level, user)) && isMax === Infinity) {
    exp -= await getExpNeeded(level, user);
    level++;
  }
  if (isMax !== Infinity && level >= config.MAX_LEVEL) {
    level = config.MAX_LEVEL;
    exp = 0;
    reachedMaxLevel = true;
  }
  data.exp.lv = level;
  data.exp.exp = exp;
  await saveData(user, data);
  let bonusLevelChance = (await listSkillBoost(user, 'bonusLevelChance').total) || 0;
  let bonusLevels = 0;
  while (bonusLevelChance > 0 && randomNumber() < bonusLevelChance) {
    level++;
    bonusLevels++;
    data.exp.lv = level;
    data.exp.exp = 0;
    bonusLevelChance -= 100;
  }
  if (bonusLevels > 0) await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    type: 'gain',
    gained: appliedAmount,
    oldLevel,
    oldExp,
    oldExpNeeded: await getExpNeeded(oldLevel, user),
    newLevel: level,
    newExp: exp,
    newExpNeeded: await getExpNeeded(level, user),
    bonusExp,
    reachedMaxLevel,
    bonusLevels,
  });
});
export const removeExp = selfWrap(async function removeExp(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount) || amount <= 0) throwError(`${this.name}`, `Invalid amount.`);
  const { data, current, needed, level: oldLevel } = await getUserExpData(user);
  let level = oldLevel;
  let exp = current - amount;
  while (exp < 0 && level > 1) {
    level--;
    exp += await getExpNeeded(level, user);
  }
  if (level <= 1 && exp < 0) {
    level = 1;
    exp = 0;
  }
  data.exp.lv = level;
  data.exp.exp = exp;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    type: 'remove',
    removed: amount,
    oldLevel,
    oldExp: current,
    oldExpNeeded: needed,
    newLevel: level,
    newExp: exp,
    newExpNeeded: await getExpNeeded(level, user),
  });
});
export const giveExpBoost = selfWrap(async function giveExpBoost(user, multiplier, duration) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const expiresAt = Date.now() + duration;
  data.boost.exp.push({
    multiplier,
    expiresAt,
  });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    multiplier,
    expiresAt,
  });
});
export const getExp = selfWrap(async function getExp(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const current = (data.exp.xp ??= 0);
  const level = (data.exp.lv ??= 1);
  const needed = (data.exp.expNeeded ??= getExpNeeded(level));
  return successMsg(this.name, ``, {
    user,
    current: current,
    needed: needed,
    level: level,
  });
});

export const prestigeIfCan = selfWrap(async function prestigeIfCan(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const oldPrestige = Number.isFinite(data?.prestige) ? data.prestige : 0;
  const levels = config.PRESTIGE_LEVELS ?? [];
  const currentLevel = data.exp.lv ?? 0;
  let canPrestige = false;
  if (levels.length > 0)
    if (oldPrestige < levels.length && currentLevel >= levels[oldPrestige]) canPrestige = true;
    else {
      const maxData = await isMaxLevel(user);
      if (currentLevel >= maxData.max) canPrestige = true;
    }
  if (!canPrestige) return `[!] prestigeIfCan: ${user} cannot prestige at level ${currentLevel}.`;
  const bonus = await listSkillBoost(user, 'prestigeBonus');
  const newPrestige = oldPrestige + 1 + bonus;
  const newExpNeeded = getExpNeeded(1, user);
  data.exp.lv = 1;
  data.exp.exp = 0;
  data.exp.expNeeded = newExpNeeded;
  data.prestige = newPrestige > levels.length ? levels.length : newPrestige;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    type: 'prestigeIfCan',
    user,
    newPrestige: data.prestige,
    newLevel: 1,
    newExp: 0,
    newExpNeeded,
  });
});
export const prestige = selfWrap(async function prestige(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const oldPrestige = Number.isFinite(data.prestige) ? data.prestige : 0;
  const bonus = await getSkillBonuses(user, 'prestigeBonus');
  const newPrestige = oldPrestige + 1 + bonus;
  const newExpNeeded = getExpNeeded(1, user);
  data.exp.lv = 1;
  data.exp.exp = 0;
  data.exp.expNeeded = newExpNeeded;
  data.prestige = newPrestige;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    type: 'prestige',
    user,
    newPrestige,
    newExp: 0,
    newLevel: 1,
    newExpNeeded,
  });
});
export const getPrestige = selfWrap(async function getPrestige(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const prestige = data?.prestige;
  return Number.isFinite(prestige) && prestige >= 0 ? prestige : 0;
});

export const isExpired = selfWrap(async function isExpired(boost) {
  const now = Date.now();
  const expired = typeof boost.expiresAt !== 'number' || boost.expiresAt <= now;
  return expired;
});
export const deleteAllExpiredBoosts = selfWrap(async function deleteAllExpiredBoosts(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  let summary = {};
  for (const [boostType, boosts] of Object.entries(data.boost)) {
    if (!Array.isArray(boosts)) continue;
    const length = boosts.length;
    const booosts = boosts.filter(boost => !isExpired(boost));
    const removed = length - booosts.length;
    if (removed > 0) {
      summary[boostType] = removed;
      data.boost[boostType] = booosts;
    }
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    deleted: summary,
  });
});
export const deleteExpiredBoosts = selfWrap(async function deleteExpiredBoosts(user, boostType) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.boost || !Array.isArray(data.boost[boostType])) return;
  data.boost[boostType] = data.boost[boostType].filter(boost => !isExpired(boost));
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    deleted: boostType,
  });
});
export const getActiveBoosts = selfWrap(async function getActiveBoosts(user, boostType) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.boost) data.boost = {};
  if (!Array.isArray(data.boost[boostType])) data.boost[boostType] = [];
  const now = Date.now();
  const all = data.boost[boostType];
  const activeBoosts = all.filter(boost => !isExpired(boost));
  data.boost[boostType] = activeBoosts;
  await saveData(user, data);
  const totalMultiplier = activeBoosts.reduce((acc, b) => acc * b.multiplier, 1);
  const timeLeft = activeBoosts.length > 0 ? Math.max(...activeBoosts.map(b => b.expiresAt - now)) : 0;
  return successMsg(this.name, ``, {
    user,
    active: activeBoosts.length > 0,
    boosts: activeBoosts,
    totalMultiplier,
    timeLeft,
  });
});
export const giveBoost = selfWrap(async function giveBoost(user, type, multiplier, duration) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const expiresAt = Date.now() + duration;
  data.boost[type].push({
    multiplier,
    expiresAt,
  });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    type,
    multiplier,
    expiresAt,
  });
});

export const giveLuck = selfWrap(async function giveLuck(user, category, multiplier, durationMs) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.boost) data.boost = {};
  if (!data.boost.luck) data.boost.luck = {};
  if (!Array.isArray(data.boost.luck[category])) data.boost.luck[category] = [];
  const bonus = (await listSkillBoost(user, 'luck').total) || 0;
  const bonusPercent = (await listSkillBoost(user, 'luckPercent').total) || 0;
  const boostedMultiplier = multiplier * (1 + bonusPercent) + bonus;
  const expiresAt = Date.now() + durationMs;
  data.boost.luck[category].push({ multiplier: boostedMultiplier, expiresAt });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    category,
    baseMultiplier: multiplier,
    boostedMultiplier,
    flatBonus,
    percentBonus,
    expiresAt,
  });
});
export const getLuck = selfWrap(async function getLuck(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const now = Date.now();
  const luckData = {};
  if (data?.boost?.luck) {
    for (const [category, boosts] of Object.entries(data.boost.luck)) {
      const active = boosts.filter(b => b.expiresAt > now);
      if (active.length > 0) luckData[category] = active.reduce((acc, b) => acc * b.multiplier, 1);
    }
  }
  return luckData;
});

export const giveLuckBoost = selfWrap(async function giveLuckBoost(user, multiplier, durationMs) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!Array.isArray(data.boost.luck_global)) data.boost.luck_global = [];
  const expiresAt = Date.now() + durationMs;
  data.boost.luck_global.push({ multiplier, expiresAt });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    multiplier,
    expiresAt,
  });
});
export const applyLuckBoost = selfWrap(async function applyLuckBoost(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const now = Date.now();
  const globalBoosts = (data?.boost?.luck_global || []).filter(b => b.expiresAt > now);
  const globalMultiplier = globalBoosts.reduce((acc, b) => acc * b.multiplier, 1);
  const categoryMultipliers = {};
  if (data?.boost?.luck) {
    for (const [category, boosts] of Object.entries(data.boost.luck)) {
      const active = boosts.filter(b => b.expiresAt > now);
      if (active.length > 0) {
        const categoryMultiplier = active.reduce((acc, b) => acc * b.multiplier, 1);
        categoryMultipliers[category] = categoryMultiplier * globalMultiplier;
      }
    }
  }
  return successMsg(this.name, ``, {
    user,
    globalMultiplier,
    categoryMultipliers,
    get: category => categoryMultipliers[category] || globalMultiplier || 1,
  });
});

export const givePassiveIncomeBoost = selfWrap(async function givePassiveIncomeBoost(user, multiplier, duration) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  data.boost.passiveIncome.push({
    multiplier,
    expiresAt: Date.now() + duration,
  });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    multiplier,
    expiresAt: Date.now() + duration,
  });
});
export const earnPassiveIncome = selfWrap(async function earnPassiveIncome(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const now = Date.now();
  const data = await loadData(user);
  const last = data.passiveIncome.lastClaim;
  const seconds = Math.floor((now - last) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return errorMsg(`earnPassiveIncome`, `Not enough time has passed.`);
  const prestige = Number.isFinite(data.prestige) ? data.prestige : 1;
  const coinBase = config.PASSIVE_INCOME.BASE_PER_MINUTE || 10;
  const expBase = config.PASSIVE_INCOME.EXP_BASE_PER_MINUTE || 5;
  const prestigeMultiplier = 1 + prestige * (config.PASSIVE_INCOME.MULTIPLIER_PER_PRESTIGE || 0.05);
  let totalMultiplier = prestigeMultiplier;
  const boosts = data.boost?.passiveIncome || [];
  for (const boost of boosts) {
    if (!isExpired(boost)) totalMultiplier *= boost.multiplier;
  }
  data.boost.passiveIncome = boosts.filter(boost => !isExpired(boost));
  const perSec = (await listSkillBoost(user, 'bonusPassiveIncomePerSecond').total) || 0;
  const perMin = (await listSkillBoost(user, 'bonusPassiveIncomePerMinute').total) || 0;
  const perHour = (await listSkillBoost(user, 'bonusPassiveIncomePerHour').total) || 0;
  const rawCoin = minutes * coinBase * totalMultiplier + seconds * perSec + minutes * perMin + (seconds / 3600) * perHour;
  const rawExp = minutes * expBase * totalMultiplier + seconds * perSec * 0.5 + minutes * perMin * 0.5 + (seconds / 3600) * perHour * 0.5;
  const earnedCoins = Math.floor(await applyDredcoinMultiplier(user, rawCoin));
  const earnedExp = Math.floor(await applyExpMultiplier(user, rawExp));
  data.balance.dredcoin += earnedCoins;
  data.exp.exp += earnedExp;
  data.passiveIncome.lastClaim = now;
  await saveData(user, data);
  const leveledUp = await levelUpIfCan(user);
  return successMsg(this.name, ``, {
    user,
    seconds,
    minutes,
    prestige,
    dredcoin: earnedCoins,
    exp: earnedExp,
    multiplier: totalMultiplier,
    skillBonuses: { perSec, perMin, perHour },
    leveledUp,
    income: [perSec, perMin, perHour],
  });
});
export const getPassiveIncome = selfWrap(async function getPassiveIncome(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const now = Date.now();
  const data = await loadData(user);
  const last = data.passiveIncome.lastClaim ?? now;
  const seconds = Math.floor((now - last) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) {
    return successMsg(this.name, ``, {
      user,
      seconds,
      minutes,
      dredcoin: 0,
      exp: 0,
      prestige: data.prestige || 0,
      multiplier: 1,
      skillBonuses: {},
    });
  }
  const prestige = Number.isFinite(data.prestige) ? data.prestige : 0;
  const dredBase = config.PASSIVE_INCOME.BASE_PER_MINUTE_DREDCOIN || 10;
  const expBase = config.PASSIVE_INCOME.BASE_PER_MINUTE_EXP || 5;
  const baseMult = 1 + prestige * (config.PASSIVE_INCOME.MULTIPLIER_PER_PRESTIGE || 0.05);
  let totalMultiplier = baseMult;
  const boosts = data.boost?.passiveIncome || [];
  for (const boost of boosts) {
    if (!isExpired(boost)) totalMultiplier *= boost.multiplier;
  }
  const skillBonuses = await applySkillBoosts(user);
  const perSec = skillBonuses?.bonusPassiveIncomePerSecond || 0;
  const perMin = skillBonuses?.bonusPassiveIncomePerMinute || 0;
  const perHour = skillBonuses?.bonusPassiveIncomePerHour || 0;
  const rawDred = minutes * dredBase * totalMultiplier + seconds * perSec + minutes * perMin + (seconds / 3600) * perHour;
  const rawExp = minutes * expBase * totalMultiplier + seconds * perSec * 0.5 + minutes * perMin * 0.5 + (seconds / 3600) * perHour * 0.5;
  const dredcoin = Math.floor(await applyDredcoinMultiplier(user, rawDred));
  const exp = Math.floor(await applyExpMultiplier(user, rawExp));
  return successMsg(this.name, ``, {
    user,
    seconds,
    minutes,
    dredcoin,
    exp,
    prestige,
    multiplier: totalMultiplier,
    skillBonuses: { perSec, perMin, perHour },
  });
});

export const giveCooldownBoost = selfWrap(async function giveCooldownBoost(user, multiplier, durationMs) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!Array.isArray(data.boost.cooldown)) data.boost.cooldown = [];
  data.boost.cooldown.push({
    multiplier,
    expiresAt: Date.now() + durationMs,
  });
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    multiplier,
    expiresAt: Date.now() + durationMs,
  });
});
export const getCooldownBoost = selfWrap(async function getCooldownBoost(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!Array.isArray(data.boost.cooldown)) data.boost.cooldown = [];
  const now = Date.now();
  const boosts = data.boost.cooldown;
  const activeBoosts = boosts.filter(boost => !isExpired(boost));
  if (activeBoosts.length === 0) {
    return successMsg(this.name, ``, {
      user,
      active: false,
      multiplier: 1,
      timeLeft: 0,
      boosts: [],
    });
  }
  const multiplier = activeBoosts.reduce((acc, b) => acc * b.multiplier, 1);
  const timeLeft = Math.max(...activeBoosts.map(b => b.expiresAt - now));
  return successMsg(this.name, ``, {
    user,
    active: true,
    multiplier,
    timeLeft,
    boosts: activeBoosts,
  });
});
export const resolveCooldown = selfWrap(async function resolveCooldown(cooldown, user, data) {
  if (typeof cooldown === "function") {
    const val = await cooldown(user, data);
    return successMsg(this.name, ``, { cooldown: val, user });
  }
  return successMsg(this.name, ``, { cooldown, user });
});
export const newCooldown = selfWrap(async function newCooldown(user, command, seconds) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const resolved = (await resolveCooldown(command.cooldown ?? seconds, user, data)).cooldown;
  const sec = Number(resolved);
  if (isNaN(sec)) throwError(`${this.name}`, `Invalid cooldown value: ${resolved}`);
  const now = Date.now();
  if (sec <= 0) return successMsg(this.name, ``, { setAt: now, duration: 0, expires: now });
  cooldowns = cooldowns || {};
  if (!cooldowns[user]) cooldowns[user] = {};
  const baseDuration = sec * 1000;
  const skillBoosts = await applySkillBoosts(user);
  const extraCooldown = skillBoosts?.bonusCooldown ?? 0;
  const reducedCooldown = skillBoosts?.debuffCooldown ?? 0;
  let duration = baseDuration + extraCooldown - reducedCooldown;
  if (duration < 500) duration = 500;
  cooldowns[user][command] = { setAt: now, duration, expires: now + duration };
  return successMsg(this.name, ``, { user, command, baseDuration, finalDuration: duration, expire: now + duration });
});
export const newGlobalCooldown = selfWrap(async function newGlobalCooldown(user, command, seconds) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const resolved = (await resolveCooldown(command.globalCooldown ?? seconds, user, data)).cooldown;
  const sec = Number(resolved);
  if (isNaN(sec)) throwError(`${this.name}`, `Invalid global cooldown value: ${resolved}`);
  const now = Date.now();
  if (sec <= 0) return successMsg(this.name, ``, { user, expires: now, setAt: now });
  if (!data.globalCooldown) data.globalCooldown = {};
  data.globalCooldown[command] = { expires: now + sec * 1000, setAt: now };
  await saveData(user, data);
  return successMsg(this.name, ``, { user, expires: now + sec * 1000, setAt: now });
});
export const Cooldown = selfWrap(async function Cooldown(user, command) {
  if (!(await isValidUser(user))) return false;
  await initUserObject(user);
  const data = await loadData(user);
  const cd = cooldowns?.[user]?.[command];
  if (!cd || typeof cd.expires !== "number") return false;
  const now = Date.now();
  const { active, multiplier } = await getCooldownBoost(user);
  const duration = (await resolveCooldown(command.cooldown, user, data)).cooldown;
  if (active && cd.setAt && duration) {
    const adjustedDuration = (cd.duration ?? duration * 1000) / multiplier;
    const endTime = cd.setAt + adjustedDuration;
    const remaining = Math.max(0, endTime - now);
    if (remaining <= 0) {
      delete cooldowns[user][command];
      return false;
    }
    return successMsg(this.name, ``, { user, command, remaining, expires: endTime, claimableAt: new Date(endTime) });
  }
  const remaining = cd.expires - now;
  if (remaining <= 0) {
    delete cooldowns[user][command];
    return false;
  }
  return successMsg(this.name, ``, { user, command, remaining, expires: cd.expires, claimableAt: new Date(cd.expires) });
});
export const GlobalCooldown = selfWrap(async function GlobalCooldown(user, command) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const cd = data?.globalCooldown?.[command];
  if (!cd) return false;
  const now = Date.now();
  const { active, multiplier } = await getCooldownBoost(user);
  const duration = (await resolveCooldown(command.globalCooldown, user, data)).cooldown;
  if (active && cd.setAt && duration) {
    const elapsed = now - cd.setAt;
    const boosted = elapsed * multiplier;
    const remaining = Math.max(0, cd.expires - (cd.setAt + boosted));
    if (remaining <= 0) {
      delete data.globalCooldown[command];
      await saveData(user, data);
      return false;
    }
    return successMsg(this.name, ``, { user, command, remaining, expires: now + remaining, claimableAt: new Date(now + remaining) });
  }
  const remaining = cd.expires - now;
  if (remaining <= 0) {
    delete data.globalCooldown[command];
    await saveData(user, data);
    return false;
  }
  return successMsg(this.name, ``, { user, command, remaining, expires: cd.expires, claimableAt: new Date(cd.expires) });
});
export const resetAllCooldowns = selfWrap(async function resetAllCooldowns(user) {
  if (!cooldowns[user]) throwError(`${this.name}`, `User ${user} not found.`);
  delete cooldowns[user];
  return successMsg(this.name, ``, {
    user,
    deleted: cooldowns[user],
  });
});
export const resetRandomCooldown = selfWrap(async function resetRandomCooldown(user) {
  if (!cooldowns[user]) throwError(`${this.name}`, `User ${user} not found.`);
  const cds = cooldowns[user];
  const keys = Object.keys(cds);
  if (keys.length === 0) return null;
  const chosen = keys[Math.floor(randomNumber(0, keys.length))];
  delete cds[chosen];
  return successMsg(this.name, ``, {
    user,
    name: chosen,
  });
});
export const doubleAllCooldowns = selfWrap(async function doubleAllCooldowns(user) {
  if (!cooldowns[user]) throwError(`${this.name}`, `User ${user} not found.`);
  const now = Date.now();
  for (const cmd in cooldowns[user]) {
    const cd = cooldowns[user][cmd];
    const timeLeft = cd.expires - now;
    cd.expires = now + timeLeft * 2;
  }
  return cooldowns[user];
});

export const gambleStreak = selfWrap(async function gambleStreak(user, streak) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  streak = Number(streak);
  if (!isInteger(streak) || streak < 0) throwError(`${this.name}`, `Invalid streak.`);
  const data = await loadData(user);
  data.streak.gamble = streak;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    streak,
  });
});
export const getGambleStreak = selfWrap(async function getGambleStreak(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  return data.streak.gamble ?? 0;
});
export const calcNextStreak = selfWrap(async function calcNextStreak(lastClaim, type) {
  if (!lastClaim) return { next: 0, expire: 0, nextAt: 0, expireAt: 0, isDone: false };
  const addMap = {
    daily: { days: 1 },
    weekly: { weeks: 1 },
    monthly: { months: 1 },
    yearly: { years: 1 }
  };
  const now = DateTime.utc();
  const last = DateTime.fromMillis(lastClaim, { zone: "utc" });
  const nextAt = last.plus(addMap[type]).toMillis();
  const expireAt = last.plus({ ...addMap[type], ...addMap[type] }).toMillis();
  let isDone = false;
  if (type === "daily") isDone = last.hasSame(now, "day");
  else if (type === "weekly") isDone = last.hasSame(now, "week");
  else if (type === "monthly") isDone = last.hasSame(now, "month");
  else if (type === "yearly") isDone = last.hasSame(now, "year");
  return successMsg(this.name, ``, 0, {
    lastClaim,
    type,
    next: Math.max(0, nextAt - now.toMillis()),
    expire: Math.max(0, expireAt - now.toMillis()),
    nextAt,
    expireAt,
    isDone
  });
});
export const dailyStreak = selfWrap(async function dailyStreak(user, streak, lastClaim) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  streak = Number(streak);
  if (!isInteger(streak) || streak < 0) throwError(`${this.name}`, `Invalid streak.`);
  const data = await loadData(user);
  if (!data.streak.daily) data.streak.daily = {};
  data.streak.daily.streak = streak;
  data.streak.daily.lastClaim = lastClaim || Date.now();
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    streak,
    lastClaim: data.streak.daily.lastClaim,
    ...calcNextStreak(data.streak.daily.lastClaim, "daily")
  });
});
export const getDailyStreak = selfWrap(async function getDailyStreak(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  return successMsg(this.name, ``, {
    user,
    streak: data.streak?.daily?.streak ?? 0,
    lastClaim: data.streak?.daily?.lastClaim ?? 0,
  });
});
export const weeklyStreak = selfWrap(async function weeklyStreak(user, streak, lastClaim) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  streak = Number(streak);
  if (!isInteger(streak) || streak < 0) throwError(`${this.name}`, `Invalid streak.`);
  const data = await loadData(user);
  if (!data.streak.weekly) data.streak.weekly = {};
  data.streak.weekly.streak = streak;
  data.streak.weekly.lastClaim = lastClaim || Date.now();
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    streak,
    lastClaim: data.streak.weekly.lastClaim,
    ...calcNextStreak(data.streak.weekly.lastClaim, "weekly")
  });
});
export const getWeeklyStreak = selfWrap(async function getWeeklyStreak(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  return successMsg(this.name, ``, {
    user,
    streak: data.streak?.weekly?.streak ?? 0,
    lastClaim: data.streak?.weekly?.lastClaim ?? 0,
  });
});
export const monthlyStreak = selfWrap(async function monthlyStreak(user, streak, lastClaim) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  streak = Number(streak);
  if (!isInteger(streak) || streak < 0) throwError(`${this.name}`, `Invalid streak.`);
  const data = await loadData(user);
  if (!data.streak.monthly) data.streak.monthly = {};
  data.streak.monthly.streak = streak;
  data.streak.monthly.lastClaim = lastClaim || Date.now();
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    streak,
    lastClaim: data.streak.monthly.lastClaim,
    ...calcNextStreak(data.streak.monthly.lastClaim, "monthly")
  });
});
export const getMonthlyStreak = selfWrap(async function getMonthlyStreak(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const lastClaim = data.streak?.monthly?.lastClaim ?? 0;
  return successMsg(this.name, ``, {
    user,
    streak: data.streak?.monthly?.streak ?? 0,
    lastClaim,
    ...calcNextStreak(lastClaim, "monthly")
  });
});
export const yearlyStreak = selfWrap(async function yearlyStreak(user, streak, lastClaim) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  streak = Number(streak);
  if (!isInteger(streak) || streak < 0) throwError(`${this.name}`, `Invalid streak.`);
  const data = await loadData(user);
  if (!data.streak.yearly) data.streak.yearly = {};
  data.streak.yearly.streak = streak;
  data.streak.yearly.lastClaim = lastClaim || Date.now();
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    streak,
    lastClaim: data.streak.yearly.lastClaim,
    ...calcNextStreak(data.streak.yearly.lastClaim, "yearly")
  });
});
export const getYearlyStreak = selfWrap(async function getYearlyStreak(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const lastClaim = data.streak?.yearly?.lastClaim ?? 0;
  return successMsg(this.name, ``, {
    user,
    streak: data.streak?.yearly?.streak ?? 0,
    lastClaim,
    ...calcNextStreak(lastClaim, "yearly")
  });
});

export const depositDredcoin = selfWrap(async function depositDredcoin(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (await isMaxBank(user).isMax) throwError(`[!] depositDredcoin: ${user} already has the maximum allowed bank balance.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount) || amount <= 0) throwError(`[-] Invalid amount.`);
  const data = await loadData(user);
  data.balance ||= {};
  data.balance.dredcoin ??= 0;
  data.bank ||= {};
  data.bank.balance ??= 0;
  if (data.balance.dredcoin < amount) return errorMsg(`depositDredcoin`, `${user} doesn't have enough Dredcoin (needs ${amount}).`);
  const tax = await getTax(amount, user);
  const netDeposit = amount - tax;
  data.balance.dredcoin -= amount;
  data.bank.balance += netDeposit;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    taxed: tax,
    deposited: netDeposit,
    walletRemaining: data.balance.dredcoin,
    bankNow: data.bank.balance,
  });
});
export const withdrawDredcoin = selfWrap(async function withdrawDredcoin(user, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount) || amount <= 0) throwError(`${this.name}`, `Invalid amount.`);
  const data = await loadData(user);
  data.balance ||= {};
  data.balance.dredcoin ??= 0;
  data.bank ||= {};
  data.bank.balance ??= 0;
  if (data.bank.balance < amount) return errorMsg(`withdrawDredcoin`, `${user} doesn't have enough in bank (needs ${amount}).`);
  const tax = await getTax(amount, user);
  const netWithdraw = amount - tax;
  if (await isMaxCoin(user).isMax) return `[!] withdrawDredcoin: {user} already has the maximum allowed Dredcoin.`;
  const projectedTotal = data.balance.dredcoin + netWithdraw;
  if (config.MAX_DREDCOIN !== false && projectedTotal > config.MAX_DREDCOIN) {
    const allowedAmount = config.MAX_DREDCOIN - data.balance.dredcoin;
    return `[!] withdrawDredcoin: Cannot withdraw. Limit exceeded. Max allowed: ${allowedAmount}`;
  }
  data.bank.balance -= amount;
  data.balance.dredcoin += netWithdraw;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    taxed: tax,
    withdrawn: netWithdraw,
    bankRemaining: data.bank.balance,
    walletNow: data.balance.dredcoin,
  });
});
export const transferDredcoin = selfWrap(async function transferDredcoin(userA, userB, amount) {
  if (!(await isValidUser(userA))) throwError(`${this.name}`, `Sender '${userA}' not found.`);
  if (!(await isValidUser(userB))) throwError(`${this.name}`, `Receiver '${userB}' not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount) || amount <= 0) throwError(`${this.name}`, `Invalid amount '${amount}'.`);
  const dataA = await loadData(userA);
  const dataB = await loadData(userB);
  dataA.balance ||= {};
  dataA.balance.dredcoin ??= 0;
  dataB.balance ||= {};
  dataB.balance.dredcoin ??= 0;
  if (dataA.balance.dredcoin < amount) return errorMsg(`transferDredcoin`, `'${userA}' doesn't have enough Dredcoin (needs ${amount}, has ${dataA.balance.dredcoin}).`);
  const tax = await getTax(amount, userA);
  const afterTax = amount - tax;
  const { isMax } = await isMaxCoin(userB);
  if (isMax) return `[!] transferDredcoin: '${userB}' already has the maximum allowed Dredcoin.`;
  const projected = dataB.balance.dredcoin + afterTax;
  if (config.MAX_TRANSFER !== false && projected > config.MAX_TRANSFER) {
    const allowed = config.MAX_TRANSFER - dataB.balance.dredcoin;
    return `[!] transferDredcoin: '${userB}' can only receive ${allowed} more Dredcoin (MAX_TRANSFER).`;
  }
  if (config.MAX_DREDCOIN !== false && projected > config.MAX_DREDCOIN) {
    const allowed = config.MAX_DREDCOIN - dataB.balance.dredcoin;
    return `[!] transferDredcoin: '${userB}' can only receive ${allowed} more Dredcoin (MAX_DREDCOIN).`;
  }
  dataA.balance.dredcoin -= amount;
  dataB.balance.dredcoin += afterTax;
  await saveData(userA, dataA);
  await saveData(userB, dataB);
  return successMsg(this.name, ``, {
    from: userA,
    to: userB,
    sent: amount,
    taxed: tax,
    received: afterTax,
    senderRemaining: dataA.balance.dredcoin,
    receiverTotal: dataB.balance.dredcoin,
  });
});

export const searchItemByIdOrName = selfWrap(async function searchItemByIdOrName(inventory, query) {
  const q = query.toLowerCase();
  const stack = [[inventory, []]];
  while (stack.length) {
    const [node, path] = stack.pop();
    for (const key in node) {
      const value = node[key];
      if (typeof value === 'object' && value !== null) {
        const idMatch = (typeof value.id === 'string' && value.id.toLowerCase() === q) || (typeof value.id === 'number' && value.id.toString() === q);
        const nameMatch = typeof value.name === 'string' && value.name.toLowerCase() === q;
        if (idMatch || nameMatch)
          return successMsg(this.name, ``, {
            item: value,
            pathArray: [...path, key],
          });
        else stack.push([value, [...path, key]]);
      }
    }
  }
  return successMsg(this.name, ``, {
    item: null,
  });
});
export const isItemExistByIdOrName = selfWrap(async function isItemExistByIdOrName(query) {
  if (!query) return false;
  const q = query.toString().toLowerCase();
  for (const def of Object.values(items)) {
    if (!def) continue;
    const idMatch = (typeof def.id === 'string' && def.id.toLowerCase() === q) || (typeof def.id === 'number' && def.id.toString() === q);
    const nameMatch = typeof def.name === 'string' && def.name.toLowerCase() === q;
    if (idMatch || nameMatch) return true;
  }
  return false;
});
export const getItemDefByIdOrName = selfWrap(async function getItemDefByIdOrName(query) {
  if (query == null) return null;
  const q = query.toString().toLowerCase();
  for (const def of Object.values(items)) {
    if (!def) continue;
    const idMatch = (typeof def.id === 'number' && def.id.toString() === q) || (typeof def.id === 'string' && def.id.toLowerCase() === q);
    const nameMatch = typeof def.name === 'string' && def.name.toLowerCase() === q;
    if (idMatch || nameMatch) return def;
  }
  return null;
});
export const resolveItem = selfWrap(async function resolveItem(inventory, itemPathOrObj) {
  if (typeof itemPathOrObj === 'object')
    return successMsg(this.name, ``, {
      item: itemPathOrObj,
    });
  const pathArray = itemPathOrObj.split('.');
  let current = inventory;
  for (const key of pathArray) {
    if (!current[key]) return searchItemByIdOrName(inventory, itemPathOrObj);
    current = current[key];
  }
  return successMsg(this.name, ``, {
    item: current,
    pathArray,
  });
});
export const resolveContainer = selfWrap(async function resolveContainer(inventory, pathArray) {
  let current = inventory;
  for (let i = 0; i < pathArray.length - 1; i++) {
    if (!current[pathArray[i]]) current[pathArray[i]] = {};
    current = current[pathArray[i]];
  }
  return successMsg(this.name, ``, {
    container: current,
    key: pathArray[pathArray.length - 1],
  });
});
export const createNewItemStack = async (user, itemPath, count, meta) => {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User '${user}' not found.`);
  if (typeof itemPath !== "string") throwError(`${this.name}`, `Item path must be a string.`);
  if (count <= 0) throwError(`${this.name}`, `Count must be positive.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = (data.inventory ||= {});
  const { container, key } = resolveContainer(inventory, itemPath.split("."));
  const maxStack = meta?.maxStack || Infinity;
  let remaining = count;
  let index = 1;
  const created = [];
  while (remaining > 0) {
    const stackCount = Math.min(remaining, maxStack);
    let k = index === 1 ? key : `${key}_${index}`;
    while (container[k]) {
      index++;
      k = `${key}_${index}`;
    }
    container[k] = {
      id: key,
      count: stackCount,
      ...meta
    };
    created.push({ k, count: stackCount });
    remaining -= stackCount;
    index++;
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    item: itemPath,
    created
  });
};
export const giveItem = selfWrap(async function giveItem(user, itemPath, count = 1) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User '${user}' not found.`);
  if (typeof itemPath !== "string") throwError(`${this.name}`, `Item path must be a string.`);
  await initUserObject(user);
  const skillBonuses = await applySkillBoosts(user);
  const bonusChance = Math.min(skillBonuses?.bonusItemChance || 0, 1);
  let bonusCount = 0;

  for (let i = 0; i < count; i++) if (randomNumber() < bonusChance) bonusCount++;
  const totalCount = count + bonusCount;
  const meta = items[itemPath] || {};
  if (!meta) throwError(`${this.name}`, `Metadata for '${itemPath}' not found.`);
  const result = await createNewItemStack(user, itemPath, totalCount, meta);
  return successMsg(this.name, ``, {
    user,
    item: itemPath,
    baseCount: count,
    bonusCount,
    totalGiven: totalCount,
    stacks: result.created,
    bonusChance
  });
});
export const removeItem = selfWrap(async function removeItem(user, itemPath, count = 1, removeIfZero = true) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User '${user}' not found.`);
  if (typeof itemPath !== "string") throwError(`${this.name}`, `Item path must be a string.`);
  if (count <= 0) throwError(`${this.name}`, `Count must be positive.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = (data.inventory ||= {});
  const pathArray = itemPath.split(".");
  const { container, key } = resolveContainer(inventory, pathArray);
  const target = container[key];
  if (!target || typeof target.count !== "number") return errorMsg(this.name, `'${itemPath}' not found in inventory.`);
  let removedAll = false;
  if (target.count <= count) {
    delete container[key];
    removedAll = true;
  } else target.count -= count;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    item: itemPath,
    requested: count,
    removed: removedAll ? target?.count ?? count : count,
    remaining: container[key]?.count ?? 0,
    fullyRemoved: removedAll
  });
});
export const transferItem = selfWrap(async function transferItem(userA, userB, itemPath, count = 1) {
  if (!(await isValidUser(userA))) throwError(`${this.name}`, `Sender '${userA}' not found.`);
  if (!(await isValidUser(userB))) throwError(`${this.name}`, `Receiver '${userB}' not found.`);
  if (typeof itemPath !== "string") throwError(`${this.name}`, `Item path must be a string.`);
  if (count <= 0) throwError(`${this.name}`, `Count must be positive.`);
  await initUserObject(userA);
  await initUserObject(userB);
  const dataA = await loadData(userA);
  const dataB = await loadData(userB);
  const inventoryA = dataA.inventory ||= {};
  const inventoryB = dataB.inventory ||= {};
  const { container: contA, key } = resolveContainer(inventoryA, itemPath.split("."));
  const item = contA[key];
  if (!item || item.count < count) return errorMsg("transferItem", `'${userA}' does not have enough '${key}'`);
  item.count -= count;
  if (item.count <= 0) delete contA[key];
  const meta = { ...item };
  delete meta.count;
  const result = await createNewItemStack(userB, itemPath, count, meta);
  await saveData(userA, dataA);
  await saveData(userB, dataB);
  return successMsg(this.name, ``, {
    from: userA,
    to: userB,
    item: itemPath,
    transferred: count,
    stacksReceived: result.created
  });
});
export const consumeItem = selfWrap(async function consumeItem(user, item, count = 1, options = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!item.consumable) throwError(`${this.name}`, `Item ${item.id || 'unknown'} is not consumable.`);
  if (typeof item.count !== 'number') throwError('[-] consumeItem: Invalid item count.');
  await initUserObject(user);
  const preserveAble = item.type === 'consumable' && options.preserveable !== false;
  const boost = await listSkillBoost(user, 'consumableDuplicateChance');
  const preserveChance = boost.total || 0;
  const isPreserved = randomNumber() < preserveChance && preserveAble;
  const consumed = isPreserved ? count - 1 : count;
  item.count -= consumed;
  if (item.count <= 0 && options.removeIfEmpty !== false && options.pathArray) {
    const { container, key } = resolveContainer(options.inventory, options.pathArray);
    delete container[key];
    if (typeof options.onDeplete === 'function') await options.onDeplete(user, item.id);
  }
  return successMsg(this.name, ``, {
    user,
    consumed,
    isPreserved: isPreserved,
  });
});
export const useItem = selfWrap(async function useItem(user, itemPathOrObj, count = 1, options = {}, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = data?.inventory;
  if (!inventory) throwError(`${this.name}`, `User ${user} has no inventory`);
  const { item, pathArray } = resolveItem(inventory, itemPathOrObj);
  if (!item) return errorMsg(`useItem`, `${user} Item not found: ${itemPathOrObj}`);
  const availableCount = typeof item.count === 'number' ? item.count : 1;
  if (availableCount < count) return errorMsg(`useItem`, `${user} Not enough items. Available: ${availableCount}, required: ${count}`);
  if (!item.id || !item.name || !item.description || !item.rarity || !item.icon || !item.type) throwError(`${this.name}`, `${user} Item missing required fields: ${item.id}`);
  let itemLogic = items[item.id];
  if (!itemLogic) {
    const fallbackKey = Object.keys(items).find(k => k.toLowerCase() === item.id.toLowerCase() || k.toLowerCase().endsWith(`.${item.id.toLowerCase()}`));
    if (fallbackKey) itemLogic = items[fallbackKey];
  }
  if (!itemLogic?.execute) throwError(`${this.name}`, `No logic found for item ${item.id}`);
  const dep = await resolveDependencies(itemLogic.dependencies, message);
  if (Array.isArray(item.enchants)) {
    for (const e of item.enchants) {
      const base = enchants[e.id];
      if (!base?.levelFactory) continue;
      const enchant = base.levelFactory(e.level || 1);
      if (typeof enchant.execute === 'function') await enchant.execute(user, item, enchant, dep);
    }
  }
  if (item.consumable) {
    await consumeItem(user, item, count, {
      ...options,
      inventory,
      pathArray,
    });
  }
  if (typeof item.durability === 'number') {
    item.durability--;
    if (item.durability <= 0 && options.removeIfBroken !== false && pathArray) {
      const { container, key } = resolveContainer(inventory, pathArray);
      delete container[key];
      if (typeof options.onBreak === 'function') await options.onBreak(user, item.id);
    }
  }
  if (!data.stat) data.stat = {};
  data.stat.lastItemUsed = new Date();
  await saveData(user, data);
  const result = await itemLogic.execute(user, itemLogic, dep, count);
  return options.returnValue ? result : undefined;
});
export const hasItem = selfWrap(async function hasItem(user, itemPathOrObj, minCount = 1) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = data?.inventory;
  if (!inventory) return false;
  const { item } = resolveItem(inventory, itemPathOrObj);
  if (!item || typeof item.count !== 'number') return false;
  return item.count >= minCount;
});
export const equipItem = selfWrap(async function equipItem(user, itemPath) {
  if (!(await isValidUser(user))) throwError('[-] equipItem: User not found.');
  if (typeof itemPath !== 'string') throwError('[-] equipItem: Item path must be a string.');
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = data?.inventory;
  if (!inventory) throwError('[-] equipItem: User has no inventory.');
  const { item } = resolveItem(inventory, itemPath);
  if (!item) return errorMsg(`equipItem`, `Item '${itemPath}' not found.`);
  if (!item.count || item.count < 1) return errorMsg(`equipItem`, `You have no '${itemPath}' to equip.`);
  const meta = items[item.id];
  if (!meta || (!meta.type && !meta.equipSlot)) throwError("[-] equipItem: Item can't be equipped (missing type).");
  const slot = meta.equipSlot || meta.type;
  if (!slot) throwError('[-] equipItem: No valid equipment slot.');
  const equipment = (data.equipment ||= {});
  const old = equipment[slot];
  equipment[slot] = { id: item.id, name: item.name, icon: item.icon };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    equipped: equipment[slot],
    slot,
    replaced: old || null,
  });
});
export const listItems = selfWrap(async function listItems(user, options = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = data?.inventory;
  if (!inventory) return [];
  const result = [];
  const walk = (obj, path = []) => {
    for (const key in obj) {
      const val = obj[key];
      if (val && typeof val === 'object' && 'id' in val && 'count' in val) {
        const fullPath = path.concat(key);
        if (options.filter && !options.filter(val, fullPath)) continue;
        const item = { ...val, path: fullPath.join('.') };
        if (options.Metadata && typeof items === 'object' && val.id in items) item.meta = items[val.id];
        result.push(item);
      } else if (val && typeof val === 'object') walk(val, path.concat(key));
    }
  };
  walk(inventory);
  return result;
});
const item = () => {
  return items;
};
export const repairAllItemObject = selfWrap(async function repairAllItemObject(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user: ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = data?.inventory;
  if (!inventory) throwError(`${this.name}`, `No inventory found for user ${user}`);
  const repairedDetails = [];
  const walk = (obj, path = []) => {
    for (const key in obj) {
      const val = obj[key];
      const currentPath = path.concat(key);
      if (val && typeof val === 'object') {
        if ('id' in val && 'count' in val) {
          let meta = items[val.id];
          if (!meta) {
            const fallbackKey = Object.keys(items).find(k => k.toLowerCase() === val.id.toLowerCase() || k.toLowerCase().endsWith(`.${val.id.toLowerCase()}`));
            if (fallbackKey) meta = items[fallbackKey];
          }
          if (meta) {
            const fixed = [];

            for (const prop of ['name', 'description', 'rarity', 'icon', 'type', 'obtainable', 'id', 'value']) {
              if (meta[prop] !== undefined && val[prop] !== meta[prop]) {
                val[prop] = meta[prop];
                fixed.push(prop);
              }
            }

            if (val.quality === undefined && meta.type === 'tool') {
              val.quality = 100;
              fixed.push('quality');
            }

            for (const prop of ['maxEnchantSlot', 'maxEnchantTime']) {
              if (meta[prop] !== undefined && val[prop] !== meta[prop]) {
                val[prop] = meta[prop];
                fixed.push(prop);
              }
            }

            const hasEnchant = Array.isArray(val.enchants) && val.enchants.length > 0;
            if (!hasEnchant) {
              for (const key of ['enchants', 'enchantedTime', 'effects', 'enchantCount']) {
                if (key in val) {
                  delete val[key];
                  fixed.push(`removed:${key}`);
                }
              }
            }

            if (fixed.length > 0) {
              repairedDetails.push({
                path: currentPath.join('.'),
                id: val.id,
                fixed,
              });
            }
          }
        } else walk(val, currentPath);
      }
    }
  };
  walk(inventory);
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    repairedCount: repairedDetails.length,
    details: repairedDetails,
  });
});
export const getRandomItemByChance = selfWrap(async function getRandomItemByChance(user, category, range = [1, 1], options = {}) {
  const { Metadata = false, all = false } = options;
  const baseTable = config.ITEM_RARITY_CHANCE[category] || config.ITEM_RARITY_CHANCE.default;
  const luck = await getLuck(user, category);
  const rarityTable = {};
  for (const [rarity, chance] of Object.entries(baseTable)) {
    rarityTable[rarity] = chance * luck.multiplier;
  }
  const results = [];
  if (all) {
    for (const [rarity, chance] of Object.entries(rarityTable)) {
      if (randomNumber(0, 100) <= chance) {
        const pool = Object.entries(items).filter(([id, meta]) => (category === 'all' || id.startsWith(`${category}.`)) && meta.rarity === rarity && meta.obtainable !== false);
        if (pool.length === 0) continue;
        const [min, max] = range;
        const count = Math.min(pool.length, Math.floor(randomNumber(0, max - min + 1)) + min);
        const selected = pool.sort(() => 0.5 - randomNumber()).slice(0, count);
        results.push(...selected.map(([id, meta]) => (Metadata ? meta : id)));
      }
    }
    return results;
  }
  const totalWeight = Object.values(rarityTable).reduce((a, b) => a + b, 0);
  const roll = randomNumber(0, totalWeight);
  let cumulative = 0;
  let Rarity = null;
  for (const [rarity, weight] of Object.entries(rarityTable)) {
    cumulative += weight;
    if (roll < cumulative) {
      Rarity = rarity;
      break;
    }
  }
  if (!Rarity) return [];
  const pool = Object.entries(items).filter(([id, meta]) => (category === 'all' || id.startsWith(`${category}.`)) && meta.rarity === Rarity && meta.obtainable !== false);
  if (pool.length === 0) return [];
  const [min, max] = range;
  const count = Math.min(pool.length, Math.floor(randomNumber(0, max - min + 1)) + min);
  const selected = pool.sort(() => 0.5 - randomNumber()).slice(0, count);
  return selected.map(([id, meta]) => (Metadata ? meta : id));
});
export const getRandomItem = selfWrap(async function getRandomItem(user, category, range = [1, 1], options = {}) {
  const { Metadata = false, includeAmount = false, filter = () => true } = options;
  const luck = await getLuck(user, category);
  const categoryItems = Object.entries(items).filter(([id, meta]) => (category === 'all' || id.startsWith(`${category}.`)) && filter(meta) && meta.obtainable !== false);
  if (categoryItems.length === 0) return [];
  const [min, max] = range;
  const count = Math.min(categoryItems.length, Math.floor(randomNumber(0, max - min + 1)) + min);
  const shuffled = categoryItems.sort(() => 0.5 - randomNumber()).slice(0, count);
  return shuffled.map(([id, meta]) => {
    const amount = includeAmount ? Math.ceil(randomNumber(0, 3 + 1) * luck.multiplier) : 1;
    if (Metadata && includeAmount)
      return successMsg(this.name, ``, {
        user,
        ...meta,
        id,
        amount,
      });
    if (Metadata) return meta;
    if (includeAmount)
      return successMsg(this.name, ``, {
        user,
        id,
        amount,
      });
    return id;
  });
});
export const getItemsByRarity = selfWrap(async function getItemsByRarity(category, rarity, options = {}) {
  const { returnMetadata = false, filter = () => true } = options;
  const pool = Object.entries(items).filter(([id, meta]) => (category === 'all' || id.startsWith(`${category}.`)) && meta.rarity === rarity && filter(meta) && meta.obtainable !== false);
  return returnMetadata ? pool.map(([_, meta]) => meta) : pool.map(([id]) => id);
});
export const reduceDurability = selfWrap(async function reduceDurability(user, itemPath, amount = 1, removeIfBroken = true) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (typeof itemPath !== 'string') throwError(`${this.name}`, `itemPath must be a string.`);
  if (amount <= 0) throwError(`${this.name}`, `Amount can't be negative.`);
  await initUserObject(user);
  const data = await loadData(user);
  const isEquip = itemPath.startsWith('equipment.');
  const root = isEquip ? (data.equipment ||= {}) : (data.inventory ||= {});
  const pathArray = itemPath
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  const { container, key } = resolveContainer(root, pathArray);
  const item = container?.[key];
  if (!item || typeof item.durability !== 'number') return false;
  item.durability -= amount;
  if (item.durability <= 0) {
    if (removeIfBroken) delete container[key];
    else item.durability = 0;
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    itemPath,
    newDurability: item.durability,
    broken: item.durability <= 0,
  });
});

export const enchantItem = selfWrap(async function enchantItem(user, itemPath, enchantId, level = 1) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = (data.inventory ||= {});
  const { item, pathArray } = resolveItem(inv, itemPath);
  if (!item) return errorMsg(`enchantItem`, `Item not found at '${itemPath}'.`);
  if (!enchantId || typeof enchantId !== 'string' || !enchants[enchantId]) throwError(`${this.name}`, `Enchant ID '${enchantId}' is invalid or not registered.`);
  const base = enchants[enchantId];
  if (typeof base.levelFactory !== 'function') throwError(`${this.name}`, `Enchant '${enchantId}' is missing levelFactory.`);
  const maxSlot = item.maxEnchantSlot ?? 1;
  const willReplace = item.enchants?.length >= maxSlot;
  const cost = config.ENCHANT_COST(user, item, enchantId);
  if (cost.dredcoin) {
    const coins = await getDredcoin(user);
    if (coins < cost.dredcoin) return errorMsg(`enchantItem`, `Not enough Dredcoin (${coins}/${cost.dredcoin}) to enchant '${itemPath}'.`);
    await removeDredcoin(user, cost.dredcoin);
  }
  if (cost.item) await removeItem(user, cost.item, cost.count || 1);
  const timestamp = Date.now();
  const newEnchant = { id: enchantId, level };
  const { container, key: originalKey } = resolveContainer(inv, pathArray);
  if (item.count > 1) {
    item.count -= 1;
    const shortUuid = crypto.randomUUID().replace(/\D/g, '').slice(0, 4);
    const suffix = `${level}_${enchantId.split('.').pop()}.${timestamp}-${shortUuid}`;
    const newKey = `${originalKey}_e_${suffix}`;
    const newItem = {
      ...structuredClone(item),
      count: 1,
      enchants: willReplace ? [newEnchant] : (item.enchants || []).concat(newEnchant),
      effects: {},
      enchantedTime: timestamp,
      enchantCount: (item.enchantCount || 0) + 1,
    };
    container[newKey] = newItem;
    await saveData(user, data);
    return successMsg(this.name, ``, {
      user,
      split: true,
      replaced: willReplace,
      enchantId,
      level,
      newItem,
      key: newKey,
    });
  } else {
    item.enchants ||= [];
    if (willReplace) item.enchants = [newEnchant];
    else item.enchants.push(newEnchant);
    item.effects = {};
    item.enchantedTime = timestamp;
    item.enchantCount = (item.enchantCount || 0) + 1;
    await saveData(user, data);
    return successMsg(this.name, ``, {
      user,
      replaced: willReplace,
      enchantId,
      level,
      updated: true,
      key: originalKey,
    });
  }
});
export const hasEnchant = selfWrap(async function hasEnchant(user, itemPath, enchantId, level = null) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = (data.inventory ||= {});
  const { item } = resolveItem(inv, itemPath);
  if (!item || !Array.isArray(item.enchants)) return false;
  return item.enchants.some(e => e.id === enchantId && (level === null || e.level === level));
});
export const getRandomEnchant = selfWrap(async function getRandomEnchant(rarity = 'common') {
  const pool = Object.entries(enchants).filter(([_, e]) => e.rarity === rarity && e.obtainable !== false);
  if (!pool.length) return null;
  const [id, base] = pool[Math.floor(randomNumber(0, pool.length))];
  const level = Math.floor(randomNumber(0, (base.maxLevel || 1) + 1));
  return successMsg(this.name, ``, {
    rarity,
    id,
    level,
  });
});
export const getRandomEnchantByChance = selfWrap(async function getRandomEnchantByChance() {
  const table = config.ENCHANT_RARITY_CHANCE;
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  const roll = randomNumber(0, total);
  let cumulative = 0;
  for (const [rarity, chance] of Object.entries(table)) {
    cumulative += chance;
    if (roll <= cumulative) return getRandomEnchant(rarity);
  }
  return null;
});
export const enchantToItem = selfWrap(async function enchantToItem(enchantObj) {
  if (!enchantObj?.id || !enchantObj?.name || typeof enchantObj.level !== 'number') throwError('[-] enchantToItem: Invalid enchant object: must include id, name, and level');
  const scrollId = `scrolls.${enchantObj.id.replace(/\./g, '_')}_lv${enchantObj.level}`;
  const enchantName = enchantObj.name;
  return successMsg(this.name, ``, {
    id: scrollId,
    name: `${enchantName} Scroll`,
    description: `Use on an item to apply ${enchantName} (Lv ${enchantObj.level}).`,
    type: 'consumable',
    rarity: enchantObj.rarity || 'common',
    obtainable: false,
    enchantSource: {
      id: enchantObj.id,
      level: enchantObj.level,
    },
    execute: async (user, item, deps, count = 1) => {},
  });
});
export const useEnchantScroll = selfWrap(async function useEnchantScroll(user, scrollPath, targetItemPath) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = data.inventory;
  const { item: scroll } = resolveItem(inv, scrollPath);
  if (!scroll || !scroll.enchantSource) throwError('[-] useEnchantScroll: Invalid scroll, no enchant data');
  const { id: enchantId, level } = scroll.enchantSource;
  const { item: target } = resolveItem(inv, targetItemPath);
  if (!target) return '[-] useEnchantScroll: Target item not found';
  const result = await enchantItem(user, targetItemPath, enchantId, level);
  const success = await removeItem(user, scrollPath, 1);
  if (!success) return errorMsg(`useEnchantScroll`, `You dont have "${scrollPath}".`);
  return successMsg(this.name, ``, {
    user,
    ...result,
    scrollUsed: scroll.id,
    to: targetItemPath,
  });
});
export const getEnchants = selfWrap(async function getEnchants(user, itemPath) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = data.inventory;
  const { item, pathArray } = await resolveItem(inv, itemPath);
  if (!item || !Array.isArray(item.enchants)) return [];
  return item.enchants.map(e => {
    const meta = enchants[e.id];
    return successMsg(this.name, ``, {
      ...e,
      ...(meta
        ? {
            name: meta.name,
            rarity: meta.rarity,
            description: meta.description,
          }
        : {}),
    });
  });
});
export const resetEnchants = selfWrap(async function resetEnchants(user, itemPath) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = data.inventory;
  const { item } = resolveItem(inv, itemPath);
  if (!item) return errorMsg(`resetEnchants`, `Item not found at '${itemPath}'.`);
  delete item.enchants;
  delete item.enchantCount;
  delete item.lastEnchantTime;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    reset: true,
    path: itemPath,
  });
});
export const removeEnchant = selfWrap(async function removeEnchant(user, itemPath, enchantIdOrIndex) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = (data.inventory ||= {});
  const { item } = resolveItem(inv, itemPath);
  if (!item?.enchants) throwError(`${this.name}`, `No enchants found at '${itemPath}'.`);
  if (typeof enchantIdOrIndex === 'number') {
    if (enchantIdOrIndex < 0 || enchantIdOrIndex >= item.enchants.length) return errorMsg(`removeEnchant`, `Invalid enchant index ${enchantIdOrIndex}.`);
    item.enchants.splice(enchantIdOrIndex, 1);
  } else {
    const index = item.enchants.findIndex(e => e.id === enchantIdOrIndex);
    if (index === -1) return errorMsg(`removeEnchant`, `Enchant '${enchantIdOrIndex}' not found.`);
    item.enchants.splice(index, 1);
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    removed: enchantIdOrIndex,
    path: itemPath,
  });
});

export const getRecipeByIdOrName = selfWrap(async function getRecipeByIdOrName(table, query) {
  if (!table || query == null) return null;
  const q = query.toString().toLowerCase();
  for (const r of Object.values(table)) {
    if (!r) continue;
    const idMatch = (typeof r.id === 'number' && r.id.toString() === q) || (typeof r.id === 'string' && r.id.toLowerCase() === q);
    const nameMatch = typeof r.name === 'string' && r.name.toLowerCase() === q;
    if (idMatch || nameMatch) return r;
  }
  return null;
});
export const getAllRecipes = async (table) => {
  if (!table) return { recipes: [] };
  const recipes = Object.values(table).filter(r => !!r);
  return { recipes };
};
export const resolveInputToDef = selfWrap(async function resolveInputToDef(input) {
  if (input == null) return null;
  if (typeof input === 'string' || typeof input === 'number') return await getItemDefByIdOrName(input);
  if (input.id != null) return await getItemDefByIdOrName(input.id);
  if (input.name) return await getItemDefByIdOrName(input.name);
  return null;
});
export const getCraftingStatus = selfWrap(async function getCraftingStatus(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const task = data.craftingTask;
  if (!task) return false;
  const now = Date.now();
  const end = task.start + task.duration;
  const remaining = Math.max(0, end - now);
  const complete = remaining <= 0;
  return successMsg(this.name, ``, {
    user,
    active: true,
    recipeId: task.recipeId,
    output: task.output,
    start: task.start,
    end,
    remaining,
    complete,
  });
});
export const claimCraft = selfWrap(async function claimCraft(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const status = await getCraftingStatus(user);
  if (!status.active) return errorMsg(`claimCraft`, `No active crafting task.`);
  if (!status.complete) return errorMsg(`claimCraft`, `Crafting not finished.`);
  const data = await loadData(user);
  await addItem(user, status.output);
  delete data.craftingTask;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    crafted: status.output,
  });
});
export const craftItem = selfWrap(async function craftItem(user, recipeId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const recipe = getRecipeByIdOrName(recipes.crafting, recipeId);
  if (!recipe) throwError(`${this.name}`, `Unknown recipe '${recipeId}'.`);
  const data = await loadData(user);
  if (data.craftingTask) return errorMsg(`craftItem`, `You are already crafting something.`);
  const inv = (data.inventory ||= {});
  for (const input of recipe.inputs) {
    const def = await resolveInputToDef(input);
    if (!def) return errorMsg(`craftItem`, `Unknown input '${input.name ?? input.id}'.`);
    const owned = countItem(inv, def.id);
    if (owned < input.count) return errorMsg(`craftItem`, `Missing '${def.name}' (${owned}/${input.count}).`);
  }
  for (const input of recipe.inputs) {
    const def = await resolveInputToDef(input);
    if (!def) return errorMsg(`craftItem`, `Unknown input '${input.name ?? input.id}'.`);
    const success = await removeItem(user, def.id, input.count);
    if (!success) return errorMsg(`craftItem`, `You don't have "${def.name}" or not enough item.`);
  }
  const output = typeof recipe.output === 'function' ? recipe.output() : structuredClone(recipe.output);
  if (output.quality === undefined) output.quality = Math.floor(1 + randomNumber(0, 99));
  data.craftingTask = {
    recipeId,
    start: Date.now(),
    duration: recipe.craftTime || 0,
    output,
  };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    recipeId,
    duration: recipe.craftTime || 0,
    output,
  });
});
export const getCookingStatus = selfWrap(async function getCookingStatus(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const task = data.cookingTask;
  if (!task) return false;
  const now = Date.now();
  const end = task.start + task.duration;
  const remaining = Math.max(0, end - now);
  const complete = remaining <= 0;
  return successMsg(this.name, ``, {
    user,
    active: true,
    recipeId: task.recipeId,
    output: task.output,
    start: task.start,
    end,
    remaining,
    complete,
  });
});
export const claimCook = selfWrap(async function claimCook(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const status = await getCookingStatus(user);
  if (!status.active) return errorMsg(`claimCook`, `No active cooking task.`);
  if (!status.complete) return errorMsg(`claimCook`, `Cooking not finished.`);
  const data = await loadData(user);
  await addItem(user, status.output);
  delete data.cookingTask;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    cooked: status.output,
  });
});
export const cookItem = selfWrap(async function cookItem(user, recipeId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const recipe = getRecipeByIdOrName(recipes.cooking, recipeId);
  if (!recipe) throwError(`${this.name}`, `Unknown recipe '${recipeId}'.`);
  const data = await loadData(user);
  if (data.cookingTask) return errorMsg(`cookItem`, `You are already cooking something.`);
  const inv = (data.inventory ||= {});
  for (const input of recipe.inputs) {
    const def = await resolveInputToDef(input);
    if (!def) return errorMsg(`craftItem`, `Unknown input '${input.name ?? input.id}'.`);
    const owned = countItem(inv, def.id);
    if (owned < input.count) return errorMsg(`craftItem`, `Missing '${def.name}' (${owned}/${input.count}).`);
  }
  for (const input of recipe.inputs) {
    const def = await resolveInputToDef(input);
    if (!def) return errorMsg(`craftItem`, `Unknown input '${input.name ?? input.id}'.`);
    const success = await removeItem(user, def.id, input.count);
    if (!success) return errorMsg(`craftItem`, `You don't have "${def.name}" or not enough item.`);
  }
  const output = typeof recipe.output === 'function' ? recipe.output() : structuredClone(recipe.output);
  if (output.quality === undefined) output.quality = Math.floor(1 + randomNumber(0, 99));
  data.cookingTask = {
    recipeId,
    start: Date.now(),
    duration: recipe.cookTime || 0,
    output,
  };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    recipeId,
    duration: recipe.cookTime || 0,
    output,
  });
});
export const getMeltingStatus = selfWrap(async function getMeltingStatus(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const task = data.meltingTask;
  if (!task) return false;
  const now = Date.now();
  const end = task.start + task.duration;
  const remaining = Math.max(0, end - now);
  const complete = remaining <= 0;
  return successMsg(this.name, ``, {
    user,
    active: true,
    recipeId: task.recipeId,
    output: task.output,
    start: task.start,
    end,
    remaining,
    complete,
  });
});
export const claimMelt = selfWrap(async function claimMelt(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const status = await getMeltingStatus(user);
  if (!status.active) return errorMsg(`claimMelt`, `No active melting task.`);
  if (!status.complete) return errorMsg(`claimMelt`, `Melting not finished.`);
  const data = await loadData(user);
  await addItem(user, status.output);
  delete data.meltingTask;
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    melted: status.output,
  });
});
export const meltItem = selfWrap(async function meltItem(user, recipeId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const recipe = getRecipeByIdOrName(recipe.melting, recipeId);
  if (!recipe) throwError(`${this.name}`, `Unknown recipe '${recipeId}'.`);
  const data = await loadData(user);
  if (data.meltingTask) return errorMsg(`meltItem`, `You are already melting something.`);
  const inv = (data.inventory ||= {});
  for (const input of recipe.inputs) {
    const def = await resolveInputToDef(input);
    if (!def) return errorMsg(`craftItem`, `Unknown input '${input.name ?? input.id}'.`);
    const owned = countItem(inv, def.id);
    if (owned < input.count) return errorMsg(`craftItem`, `Missing '${def.name}' (${owned}/${input.count}).`);
  }
  for (const input of recipe.inputs) {
    const def = await resolveInputToDef(input);
    if (!def) return errorMsg(`craftItem`, `Unknown input '${input.name ?? input.id}'.`);
    const success = await removeItem(user, def.id, input.count);
    if (!success) return errorMsg(`craftItem`, `You don't have "${def.name}" or not enough item.`);
  }
  const output = typeof recipe.output === 'function' ? recipe.output() : structuredClone(recipe.output);
  if (output.quality === undefined) output.quality = Math.floor(1 + randomNumber(0, 99));
  data.meltingTask = {
    recipeId,
    start: Date.now(),
    duration: recipe.meltTime || 0,
    output,
  };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    recipeId,
    duration: recipe.meltTime || 0,
    output,
  });
});

export const disassembleItem = selfWrap(async function disassembleItem(user, itemPath, count = 1) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!isInteger(count) || count < 1) throwError(`${this.name}`, `Invalid count '${count}'.`);
  await initUserObject(user);
  const { item } = resolveItem(userInventory, itemPath);
  if (!item) return errorMsg(`disassembleItem`, `Item '${itemPath}' not found.`);
  if (item.count < count) return errorMsg(`disassembleItem`, `Not enough '${item.id}' to disassemble (${item.count}/${count}).`);
  const def = items[item.id];
  if (!def?.disassemble) return errorMsg(`disassembleItem`, `'${item.id}' is not disassemblable.`);
  const dep = await resolveDependencies(def.dependencies);
  const oneResult = await def.disassemble(user, item, dep);
  if (!oneResult || oneResult === false) return errorMsg(`disassembleItem`, `'${item.id}' cannot be disassembled.`);
  const removed = await removeItem(user, itemPath, count);
  if (!removed) return errorMsg(`disassembleItem`, `Failed to remove items from inventory.`);
  const totalResult = {};
  for (let i = 0; i < count; i++) {
    for (const mat of oneResult) {
      const roll = randomNumber;
      const chance = mat.chance ?? 1;
      if (roll > chance) continue;
      const c = mat.count;
      let amt = 1;
      if (typeof c === 'number') amt = c;
      else if (c?.min != null && c?.max != null) {
        const min = Math.max(0, c.min);
        const max = Math.max(min, c.max);
        amt = Math.floor(randomNumber(max - min + 1)) + min;
      }
      if (amt > 0) {
        const key = typeof mat.id === 'number' ? mat.id.toString() : mat.id.toLowerCase();
        totalResult[key] = (totalResult[key] || 0) + amt;
      }
    }
  }
  for (const [id, amt] of Object.entries(totalResult)) await addItem(user, id, amt);
  return successMsg(this.name, ``, {
    user,
    itemPath,
    count,
    result: Object.entries(totalResult).map(([id, count]) => ({ id, count })),
  });
});
export const disassemblePreview = selfWrap(async function disassemblePreview(user, item) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!item || !item.id) throwError(`${this.name}`, `Invalid item input.`);
  await initUserObject(user);
  const def = items[item.id];
  if (!def?.disassemble) return false;
  const dep = await resolveDependencies(def?.dependencies);
  const result = await def.disassemble(user, item, dep);
  if (!result || result === false) return false;
  const final = [];
  for (const mat of result) {
    const chance = mat.chance ?? 1;
    if (chance < 1) final.push({ user, id: mat.id, count: mat.count, chance });
    else final.push({ user, id: mat.id, count: mat.count });
  }
  return final;
});
export const reforgeItem = selfWrap(async function reforgeItem(user, itemPath) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = (data.inventory ||= {});
  const { item } = resolveItem(inv, itemPath);
  if (!item) throwError(`${this.name}`, `Item not found at '${itemPath}'.`);
  const current = item.quality || 100;
  if (current === 100) return errorMsg(`reforgeItem`, `'${itemPath}' is already 100% quality.`);
  const cost = config.REFORGE_COST?.(user, item) || { dredcoin: 10000 };
  if (cost.dredcoin) {
    const coins = await getDredcoin(user);
    if (coins < cost.dredcoin) return errorMsg(`reforgeItem`, `Not enough Dredcoin (${coins}/${cost.dredcoin}) to reforge '${itemPath}'.`);
    await removeDredcoin(user, cost.dredcoin);
  }
  if (cost.item) {
    const success = await removeItem(user, cost.item, cost.count || 1);
    if (!success) return errorMsg(`reforgeItem`, `You don't have "${cost.item}" or not enough item.`);
  }
  const oldQuality = item.quality || 100;
  item.quality = Math.floor(1 + randomNumber(0, 99));
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    oldQuality,
    newQuality: item.quality,
    itemPath,
  });
});
export const formatItemQuality = selfWrap(async function formatItemQuality(quality, options = {}) {
  if (typeof quality !== 'number' || isNaN(quality)) return 'Unknown';
  const { bold, emoji = true, tier = true, discordFormat = false } = options;
  const q = quality.toFixed(1);
  const tiers = [
    { min: 95, label: 'Perfect', icon: '💎', discord: '<::>' },
    { min: 85, label: 'Excellent', icon: '🔷', discord: '<::>' },
    { min: 70, label: 'Good', icon: '🔵', discord: '<::>' },
    { min: 50, label: 'Fair', icon: '🟢', discord: '<::>' },
    { min: 25, label: 'Worn', icon: '🟠', discord: '<::>' },
    { min: 0, label: 'Broken', icon: '🔴', discord: '<::>' },
  ];
  const matched = tiers.find(t => quality >= t.min);
  if (!matched) return 'Unknown';
  const name = bold ? `**${matched.label}**` : matched.label;
  const icon = discordFormat ? matched.discord : matched.icon;
  const label = [emoji ? icon : null, tier ? name : null].filter(Boolean).join(' ');
  return `${label} (${q}%)`;
});

export const createTrade = selfWrap(async function createTrade(fromUser, toUser, toUserConfirmed = null) {
  if (!(await isValidUser(fromUser))) throwError(`${this.name}`, `User ${fromUser} not found.`);
  if (!(await isValidUser(toUser))) throwError(`${this.name}`, `User ${toUser} not found.`);
  if (fromUser === toUser) return errorMsg(`${this.name}`, 'You cannot trade with yourself');
  await initUserObject(fromUser);
  await initUserObject(toUser);
  const fromData = await loadData(fromUser);
  const toData = await loadData(toUser);
  if (fromData.trade?._active) return errorMsg(`${this.name}`, 'You already have an active trade');
  if (toData.trade?._active) return errorMsg(`${this.name}`, `${toUser} already has an active trade`);
  fromData.trade = {
    _active: true,
    partner: toUser,
    confirmed: null,
  };
  toData.trade = {
    _active: true,
    partner: fromUser,
    confirmed: toUserConfirmed,
  };
  await saveData(fromUser, fromData);
  await saveData(toUser, toData);
  let status = 'pending';
  if (toUserConfirmed === true) status = 'accepted';
  if (toUserConfirmed === false) status = 'declined';
  return errorMsg(`${this.name}`, `Trade ${status} between ${fromUser} and ${toUser}`, 0o0, {
    fromUser,
    toUser,
    status,
  });
});
export const addTradeItem = selfWrap(async function addTradeItem(user, itemPath, count = 1) {
  if (!(await isValidUser(user))) throwError(this.name, `User '${user}' not found.`);
  await initUserObject(user);
  if (typeof itemPath !== "string") throwError(this.name, `Item path must be string.`);
  if (count <= 0) throwError(this.name, `Invalid item count '${count}'.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(this.name, 'No active trade.');
  const inv = data.inventory || {};
  const { container, key } = resolveContainer(inv, itemPath.split('.'));
  if (!container[key] || container[key].count < count) return errorMsg(this.name, `Not enough '${itemPath}' to offer.`);
  data.trade.items = data.trade.items || [];
  const existing = data.trade.items.find(i => i.item === itemPath);
  if (existing) existing.count += count; else data.trade.items.push({ item: itemPath, count });
  await removeItem(user, itemPath, count, false);
  await saveData(user, data);
  return successMsg(this.name, `Added ${count}x ${itemPath} to trade.`, 0o0, {
    user,
    itemPath,
    count,
    locked: true
  });
});
export const addTradeCurrency = selfWrap(async function addTradeCurrency(user, amount = 0) {
  if (!(await isValidUser(user))) throwError(this.name, `User '${user}' not found.`);
  await initUserObject(user);
  amount = Number(amount);
  if (!isInteger(amount) || amount <= 0) throwError(this.name, `Invalid amount '${amount}'.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(this.name, 'No active trade.');
  const bal = (await loadData(user)).balance?.dredcoin || 0;
  if (bal < amount) return errorMsg(this.name, `Not enough dredcoin to offer.`);
  data.trade.currency = (data.trade.currency || 0) + amount;
  await removeDredcoin(user, amount);
  await saveData(user, data);
  return successMsg(this.name, `Added ${amount} dredcoin to trade.`, 0o0, {
    user,
    amount,
    locked: true
  });
});
export const cancelTrade = selfWrap(async function cancelTrade(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(`${this.name}`, 'No active trade to cancel');
  const partner = data.trade.partner;
  const partnerData = await loadData(partner);
  data.trade = { _active: false };
  partnerData.trade = { _active: false };
  await saveData(user, data);
  await saveData(partner, partnerData);
  return successMsg(`${this.name}`, `Trade between ${user} and ${partner} cancelled`, 0o0, { 
    user, partner 
  });
});
export const confirmTrade = selfWrap(async function confirmTrade(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(`${this.name}`, 'No active trade to confirm');
  data.trade.confirmed = true;
  await saveData(user, data);
  const partner = data.trade.partner;
  const partnerData = await loadData(partner);
  if (partnerData.trade?.confirmed) return errorMsg(`${this.name}`, `Both users confirmed trade between ${user} and ${partner}.`, 0o0, { 
    user, 
    partner 
  });
  return successMsg(`${this.name}`, `${user} confirmed trade, waiting for ${partner}.`, 0o0, { 
    user, 
    partner 
  });
});
export const declineTrade = selfWrap(async function declineTrade(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(`${this.name}`, 'No active trade to decline');
  const partner = data.trade.partner;
  const partnerData = await loadData(partner);
  data.trade = { _active: false };
  partnerData.trade = { _active: false };
  await saveData(user, data);
  await saveData(partner, partnerData);
  return successMsg(`${this.name}`, `Trade between ${user} and ${partner} declined.`, 0o0, { 
    user, 
    partner 
  });
});
export const getActiveTrade = selfWrap(async function getActiveTrade(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(`${this.name}`, 'No active trade found');
  const partner = data.trade.partner;
  return successMsg(`${this.name}`, 'Active trade retrieved.', 0o0, { 
    user, 
    partner, 
    trade: data.trade 
  });
});
export const finalizeTrade = selfWrap(async function finalizeTrade(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(this.name, 'No active trade');
  const partner = data.trade.partner;
  if (!(await isValidUser(partner))) throwError(`${this.name}`, `partner ${partner} not found.`);
  const partnerData = await loadData(partner);
  if (!partnerData.trade?._active) return errorMsg(this.name, `${partner} has no active trade`);
  if (!data.trade.confirmed || !partnerData.trade.confirmed) return errorMsg(this.name, 'Both must confirm');
  const uOffer = data.trade;
  const pOffer = partnerData.trade;
  for (const o of uOffer.items || []) {
    const inv = data.inventory || {};
    const { container, key } = resolveContainer(inv, o.item.split('.'));
    if (!container[key] || container[key].count < o.count) return errorMsg(this.name, `${user} lacks ${o.item}`);
  }
  for (const o of pOffer.items || []) {
    const inv = partnerData.inventory || {};
    const { container, key } = resolveContainer(inv, o.item.split('.'));
    if (!container[key] || container[key].count < o.count) return errorMsg(this.name, `${partner} lacks ${o.item}`);
  }
  const uBal = (await loadData(user)).balance?.dredcoin || 0;
  const pBal = (await loadData(partner)).balance?.dredcoin || 0;
  if (uOffer.currency && uBal < uOffer.currency) return errorMsg(this.name, `${user} lacks dredcoin`);
  if (pOffer.currency && pBal < pOffer.currency) return errorMsg(this.name, `${partner} lacks dredcoin`);
  for (const o of uOffer.items || []) await transferItem(user, partner, o.item, o.count);
  for (const o of pOffer.items || []) await transferItem(partner, user, o.item, o.count);
  if (uOffer.currency > 0) {
    await removeDredcoin(user, uOffer.currency);
    await addDredcoin(partner, uOffer.currency);
  }
  if (pOffer.currency > 0) {
    await removeDredcoin(partner, pOffer.currency);
    await addDredcoin(user, pOffer.currency);
  }
  data.trade = { _active: false };
  partnerData.trade = { _active: false };
  await saveData(user, data);
  await saveData(partner, partnerData);
  return successMsg(this.name, 'Trade completed successfully', 0o0, {
    from: user,
    to: partner,
    itemsA: uOffer.items || [],
    itemsB: pOffer.items || [],
    dredcoinA: uOffer.currency || 0,
    dredcoinB: pOffer.currency || 0,
  });
});
export const getUserTradeStatus = selfWrap(async function getUserTradeStatus(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const data = await loadData(user);
  if (!data.trade?._active) return errorMsg(`${this.name}`, 'No active trade', 0o0, { active: false });
  return successMsg(`${this.name}`, 'User trade status retrieved.', 0o0, {
    active: true,
    partner: data.trade.partner,
    confirmed: data.trade.confirmed,
  });
});
export const autoCancelInactiveTrades = selfWrap(async function autoCancelInactiveTrades(maxMs = 600000) {
  const now = Date.now();
  const allUsers = await loadAllUsers();
  let cancelled = 0;
  for (const u of allUsers) {
    const data = await loadData(u);
    const lastTradeTime = data.trade?.timestamp ?? 0;
    if (data.trade?._active && now - lastTradeTime > maxMs) {
      const partner = data.trade.partner;
      const pData = await loadData(partner);
      data.trade = { _active: false };
      pData.trade = { _active: false };
      await saveData(u, data);
      await saveData(partner, pData);
      cancelled++;
    }
  }
  return successMsg(`${this.name}`, `Cancelled ${cancelled} inactive trades`, 0o0, { cancelled });
});

export const filterRarity = selfWrap(async function filterRarity(list, maxRarity, category) {
  if (list == null) throwError(`${this.name}`, `'list' is required.`);
  if (typeof maxRarity !== 'string') throwError(`${this.name}`, `'maxRarity' must be a string.`);
  if (!config?.RARITIES || !Array.isArray(config.RARITIES)) throwError(`${this.name}`, `config.RARITIES missing or invalid.`);
  const pool = Array.isArray(list) ? list : typeof list === 'object' ? Object.values(list) : null;
  if (!pool) throwError(`${this.name}`, `'list' must be an array or object.`);
  const maxIndex = config.RARITIES.indexOf(maxRarity.toLowerCase());
  if (maxIndex === -1) return errorMsg(`filterRarity`, `Invalid maxRarity '${maxRarity}'. Valid: ${config.RARITIES.join(', ')}`);
  if (category !== undefined && category !== null && typeof category !== 'string') throwError(`${this.name}`, `'category' must be a string if provided.`);
  const cat = category ? category.toLowerCase() : null;
  if (cat && cat !== 'event' && cat !== 'normal') return errorMsg(`filterRarity`, `Invalid category '${category}', expected 'event' or 'normal'.`);
  const result = [];
  for (const e of pool) {
    if (!e || typeof e !== 'object') continue;
    if ('rarity' in e && e.rarity != null && typeof e.rarity !== 'string') throwError(`${this.name}`, `item has invalid 'rarity' type.`);
    if (!e.rarity || typeof e.rarity !== 'string') continue;
    const rIndex = config.RARITIES.indexOf(e.rarity.toLowerCase());
    if (rIndex === -1) continue;
    if (rIndex > maxIndex) continue;
    if (cat) {
      if (cat === 'event' && !['event', 'limited'].includes(e.rarity.toLowerCase())) continue;
      if (cat === 'normal' && ['event', 'limited'].includes(e.rarity.toLowerCase())) continue;
    }
    result.push(e);
  }
  if (!result.length) return errorMsg(`filterRarity`, `No matching entries found for maxRarity='${maxRarity}' category='${category || 'any'}'.`);
  return result;
});
export const pickRandomByRarity = selfWrap(async function pickRandomByRarity(list, maxRarity, category) {
  if (list == null) throwError(`${this.name}`, `'list' is required.`);
  if (typeof maxRarity !== 'string') throwError(`${this.name}`, `'maxRarity' must be a string.`);
  const filtered = await filterRarity(list, maxRarity, category);
  if (typeof filtered === 'string' && filtered.startsWith('[-]')) return errorMsg(`pickRandomByRarity`, `${filtered}`);
  if (!Array.isArray(filtered)) throwError(`${this.name}`, `Unexpected result from filterRarity, got ${typeof filtered}.`);
  const i = Math.floor(Math.random() * filtered.length);
  return filtered[i];
});

export const startHatchEgg = selfWrap(async function startHatchEgg(user, eggPath) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  if (!eggPath || typeof eggPath !== 'string') throwError(`${this.name}`, `'eggPath' must be a string.`);
  const data = await loadData(user);
  data.hatching ||= {};
  if (data.hatching.active) return errorMsg(`startHatchEgg`, `user already has an egg hatching.`);
  const { item: egg, pathArray } = resolveItem(data.inventory, eggPath);
  if (!egg) return errorMsg(`startHatchEgg`, `egg '${eggPath}' not found in inventory.`);
  if (!egg.rarity) throwError(`${this.name}`, `egg missing rarity field.`);
  if (!egg.hatchTime || typeof egg.hatchTime !== 'number') throwError(`${this.name}`, `egg missing hatchTime field.`);
  if (!egg.hatchable) return errorMsg(`startHatchEgg`, `not a egg or not hatchable.`);
  const removed = await removeItem(user, eggPath, 1);
  if (!removed) throwError(`${this.name}`, `failed to remove egg from inventory.`);
  const start = Date.now();
  const end = start + egg.hatchTime;
  data.hatching = { active: true, egg, start, end };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    egg,
    start,
    end,
    remaining: egg.hatchTime,
  });
});
export const hatchEgg = selfWrap(async function hatchEgg(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  if (!Array.isArray(pets)) return errorMsg(`hatchEgg`, `'pets' must be an array.`);
  if (!config?.RARITIES || !Array.isArray(config.RARITIES)) throwError(`${this.name}`, `config.RARITIES missing or invalid.`);
  const data = await loadData(user);
  const hatch = data.hatching;
  if (!hatch?.active) return errorMsg(`hatchEgg`, `no egg is currently hatching.`);
  if (Date.now() < hatch.end) return errorMsg(`hatchEgg`, `egg is still hatching, wait until ${hatch.end}.`);
  let hatchedPets = [];
  if (hatch.egg.hatchPets && typeof hatch.egg.hatchPets === 'object') {
    const total = Object.keys(hatch.egg.hatchPets).reduce((a, k) => a + Number(k), 0);
    if (total !== 100) return errorMsg(`hatchEgg`, `hatchPets percentages must total 100.`);
    const roll = randomNumber(0, 100);
    let sum = 0;
    for (const [percent, petIds] of Object.entries(hatch.egg.hatchPets)) {
      sum += Number(percent);
      if (roll <= sum) {
        const ids = Array.isArray(petIds) ? petIds : [petIds];
        for (const id of ids) {
          const found = pets.find(p => p.id === id);
          if (!found) throwError(`${this.name}`, `pet with id '${id}' not found in pets list.`);
          hatchedPets.push(found);
        }
        break;
      }
    }
  } else {
    const rarity = hatch.egg.rarity.toLowerCase();
    const category = ['event', 'limited'].includes(rarity) ? 'event' : 'normal';
    const picked = await pickRandomByRarity(pets, rarity, category);
    if (typeof picked === 'string') return picked;
    hatchedPets = [picked];
  }
  data.hatching = { active: false };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    egg: hatch.egg,
    hatchedAt: Date.now(),
    pets: hatchedPets,
  });
});
// REMOVE the current active egg
export const cancelHatchEgg = selfWrap(async function cancelHatchEgg(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.hatching?.active) return errorMsg(`cancelHatchEgg`, `no active hatch to cancel.`);
  const cancelledEgg = data.hatching.egg;
  data.hatching = { active: false };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    cancelledEgg,
    cancelledAt: Date.now(),
  });
});
// REFUND the current active egg
export const refundEggOnCancel = selfWrap(async function refundEggOnCancel(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  if (!data.hatching?.active) return errorMsg(`refundEggOnCancel`, `no active hatch to cancel.`);
  const egg = data.hatching.egg;
  if (!egg?.id) throwError(`${this.name}`, `egg data invalid, cannot refund.`);
  await giveItem(user, egg.id, 1);
  data.hatching = { active: false };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    refundedEgg: egg,
    refundedAt: Date.now(),
  });
});
export const checkHatchStatus = selfWrap(async function checkHatchStatus(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const hatch = data.hatching;
  if (!hatch?.active) return errorMsg(`checkHatchStatus`, `no egg hatching.`);
  return successMsg(this.name, ``, {
    user,
    egg: hatch.egg,
    start: hatch.start,
    end: hatch.end,
    remaining: Math.max(0, hatch.end - Date.now()),
  });
});
export const listUserEggs = selfWrap(async function listUserEggs(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inventory = data?.inventory;
  const eggs = [];
  const walk = (obj, path = []) => {
    for (const key in obj) {
      const val = obj[key];
      if (val && typeof val === 'object' && 'id' in val && 'count' in val) {
        if (val.type === 'egg') eggs.push({ ...val, path: path.concat(key).join('.') });
      } else if (val && typeof val === 'object') walk(val, path.concat(key));
    }
  };
  walk(inventory);
  return successMsg(this.name, ``, {
    user,
    total: eggs.length,
    eggs,
  });
});

export const listItemForSale = selfWrap(async function listItemForSale(user, itemPath, price) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!isInteger(price) || price <= 0 || price > Number.MAX_SAFE_INTEGER) throwError(`${this.name}`, `Invalid price '${price}'.`);
  await initUserObject(user);
  const data = await loadData(user);
  const inv = (data.inventory ||= {});
  const { item } = resolveItem(inv, itemPath);
  if (!item) return errorMsg(`listItemForSale`, `Item '${itemPath}' not found.`);
  if (item.count < 1) return errorMsg(`listItemForSale`, `No item count left at '${itemPath}'.`);
  const success = await removeItem(user, itemPath, 1);
  if (!success) return errorMsg(`listItemForSale`, `You don't have "${itemPath}" or not enough item.`);
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  const frozenItem = {
    id: item.id,
    name: item.name,
    count: 1,
    rarity: item.rarity,
    type: item.type,
    ...(item.metadata ? { metadata: structuredClone(item.metadata) } : {}),
  };
  await saveListing({ id, seller: user.toLowerCase(), item: frozenItem, price, timestamp });
  return successMsg(this.name, ``, {
    id,
    seller: user.toLowerCase(),
    price,
    timestamp,
  });
});
export const buyListing = selfWrap(async function buyListing(buyer, listingId) {
  if (!(await isValidUser(buyer))) throwError(`${this.name}`, `Invalid buyer '${buyer}'.`);
  await initUserObject(buyer);
  const listing = getListingById(listingId);
  if (!listing) return errorMsg(`buyListing`, `Listing '${listingId}' not found.`);
  if (buyer.toLowerCase() === listing.seller.toLowerCase()) return errorMsg(`buyListing`, `You cannot buy your own listing.`);
  const balance = await getDredcoin(buyer);
  if (balance < listing.price) return errorMsg(`buyListing`, `Not enough Dredcoin (${balance}/${listing.price}).`);
  await removeDredcoin(buyer, listing.price);
  await addItem(buyer, listing.item.id, 1, listing.item);
  if (await isValidUser(listing.seller)) await addDredcoin(listing.seller, listing.price);
  await deleteListing(listingId);
  return successMsg(this.name, ``, {
    buyer,
    seller: listing.seller,
    item: listing.item,
    price: listing.price,
  });
});
export const cancelListing = selfWrap(async function cancelListing(user, listingId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user '${user}'.`);
  await initUserObject(user);
  const listing = getListing(listingId);
  if (!listing) return errorMsg(`cancelListing`, `Listing '${listingId}' not found.`);
  if (listing.seller.toLowerCase() !== user.toLowerCase()) return errorMsg(`cancelListing`, `You can only cancel your own listings.`);
  await addItem(user, listing.item.id, 1, listing.item);
  await deleteListing(listingId);
  return successMsg(this.name, ``, {
    user,
    restoredItem: listing.item,
    listingId,
  });
});
export const refundExpiredListings = selfWrap(async function refundExpiredListings(expiryMs = 48 * 3600 * 1000) {
  const expiredBefore = Date.now() - expiryMs;
  const listings = getAllListings().filter(l => l.timestamp < expiredBefore);
  for (const listing of listings) {
    if (await isValidUser(listing.seller)) await addItem(listing.seller, listing.item.id, 1, listing.item);
    await deleteListing(listing.id);
  }
  return successMsg(this.name, ``, {
    refunded: listings.length,
  });
});

// confusing functions so i put comments here
export const skillBoostList = {
  dredcoin: ['dredcoinBonus', 'dredcoinMultiplier'],
  ignoreTax: ['ignoreTaxPercent'],
  consumable: ['itemPreserveMultiplier'],
  expBonus: ['expGainMultiplier'],
  bonusPassiveIncomePerSecond: [],
  bonusPassiveIncomePerMinute: [],
  bonusPassiveIncomePerHour: [],
  expNeededDebuffPercent: [],
  bonusLevelChance: [],
  loot: ['lootBonus', 'dropRateMultiplier'],
};
export const skillExpNeeded = selfWrap(async function skillExpNeeded(lvl) {
  return Math.floor(100 * Math.pow(1.5, lvl - 1));
});
export const searchSkillByIdOrName = selfWrap(async function searchSkillByIdOrName(skills, query) {
  const q = query.toLowerCase();
  for (const slot in skills) {
    const skill = skills[slot];
    if (!skill || typeof skill !== 'object') continue;
    const idMatch = skill.id?.toLowerCase() === q;
    const nameMatch = skill.name?.toLowerCase() === q;
    if (idMatch || nameMatch)
      return successMsg(this.name, ``, {
        skill,
        slot,
      });
  }
  return successMsg(this.name, ``, {
    skill: null,
  });
});
export const resolveSkill = selfWrap(async function resolveSkill(skills, skillOrSlot) {
  if (typeof skillOrSlot === 'object')
    return successMsg(this.name, ``, {
      skill: skillOrSlot,
    });
  const slot = skillOrSlot;
  if (skills[slot])
    return successMsg(this.name, ``, {
      skill: skills[slot],
      slot,
    });
  return searchSkillByIdOrName(skills, skillOrSlot);
});
export const giveSkill = selfWrap(async function giveSkill(user, slot, skillId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const skill = data.skills;
  const def = skills[skillId];
  if (!def) throwError(`${this.name}`, `Skill not found '${skillId}'.`);
  skill[slot] = {
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    obtainable: def.obtainable ?? true,
    learned: true,
    exp: 0,
    level: 1,
    expNeeded: 100,
    maxLevel: def.maxLevel || null,
  };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    slot,
    skill: skill[slot],
  });
});
export const removeSkill = selfWrap(async function removeSkill(user, slotOrSkillId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const skills = data.skills;
  const { skill, slot } = resolveSkill(skills, slotOrSkillId);
  if (!skill || !slot) throwError(`${this.name}`, `Skill not found: ${slotOrSkillId}`);
  delete skills[slot];
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    removedSlot: slot,
    removedSkill: skill,
  });
});
export const applySkill = selfWrap(async function applySkill(user, slotOrSkill, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const Skills = data?.skills;
  if (!Skills) throwError(`${this.name}`, `No skills found for user ${user}`);
  const { skill, slot } = resolveSkill(Skills, slotOrSkill);
  if (!skill || !skill.id) throwError(`${this.name}`, `Invalid skill or slot: ${slotOrSkill}`);
  const logic = skills[skill.id];
  if (!logic || typeof logic.execute !== 'function') throwError(`${this.name}`, `No logic defined for skill '${skill.id}'`);
  const dep = await resolveDependencies(skill.dependencies, message);
  const executed = await logic.execute(user, skill, dep);
  return successMsg(this.name, ``, {
    user,
    slotOrSkill,
    executed,
  });
});
// List all skill name and id from user
export const listSkills = selfWrap(async function listSkills(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const skills = data?.skills || {};
  return Object.entries(skills)
    .filter(([_, skill]) => skill && typeof skill === 'object' && !Array.isArray(skill) && 'id' in skill && typeof skill.id === 'string')
    .map(([slot, skill]) => ({ slot, ...skill }));
});
// List all skill boost multipler (listSkillBoost.total) from user by skillBoostList
export const listSkillBoost = selfWrap(async function listSkillBoost(user, key) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const allBoosts = await applySkillBoosts(user);
  const boostKeys = skillBoostList[key];
  if (!boostKeys || !Array.isArray(boostKeys)) throwError(`${this.name}`, `key ${key} not found.`);
  const result = {};
  for (const key of boostKeys) {
    if (allBoosts[key]) result[key] = allBoosts[key];
  }
  const total = Object.values(result).reduce((acc, mult) => acc * mult, 1);
  return successMsg(this.name, ``, {
    user,
    total,
    ...result,
  });
});
// return total multiplier from user all skill combine
export const userAllSkillBoosts = selfWrap(async function userAllSkillBoosts(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user: ${user}`);
  await initUserObject(user);
  const allBoosts = await applySkillBoosts(user);
  const result = {};
  for (const [parentKey, boostKeys] of Object.entries(skillBoostList)) {
    const group = {};
    for (const key of boostKeys) {
      if (allBoosts[key]) group[key] = allBoosts[key];
    }
    const total = Object.values(group).reduce((acc, m) => acc * m, 1);
    result[parentKey] = { total, ...group };
  }
  return result;
});
export const allSkillBoosts = selfWrap(async function allSkillBoosts() {
  const result = {};
  for (const skillId in skills) {
    const logic = skills[skillId];
    if (!logic) continue;
    const staticBoosts = logic.boosts || {};
    const simulatedSkill = { id: skillId, level: logic.maxLevel || 1 }; // Simulate max-level skill for example
    const dynamicBoosts = typeof logic.applyBoost === 'function' ? logic.applyBoost('global', simulatedSkill) || {} : {};
    const combinedBoosts = { ...staticBoosts, ...dynamicBoosts };
    for (const [boostKey, multiplier] of Object.entries(combinedBoosts)) {
      const parentKey = boostKey.replace(/([A-Z].*)$/, '').toLowerCase() || boostKey;
      if (!result[parentKey]) result[parentKey] = { total: 1 };
      result[parentKey][boostKey] = multiplier;
      result[parentKey].total *= multiplier;
    }
  }
  return result;
});
export const giveSkillExp = selfWrap(async function giveSkillExp(user, skillIdOrSlot, amount = 10) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const skills = data.skills || {};
  const { skill, slot } = resolveSkill(skills, skillIdOrSlot);
  if (!skill || !slot) throwError(`${this.name}`, `Skill not found: ${skillIdOrSlot}`);
  skill.exp = (skill.exp || 0) + amount;
  while (skill.exp >= skill.expNeeded) {
    if (skill.maxLevel && skill.level >= skill.maxLevel) {
      skill.exp = skill.expNeeded;
      break;
    }
    skill.exp -= skill.expNeeded;
    skill.level = (skill.level || 1) + 1;
    skill.expNeeded = Math.floor(skill.expNeeded * 1.5);
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    skill,
    slot,
  });
});
export const giveSkillLv = selfWrap(async function giveSkillLv(user, skillIdOrSlot, newLevel = 1, newExp = 0, newExpNeeded = null) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const skills = (data.skills ||= {});
  const { skill, slot } = resolveSkill(skills, skillIdOrSlot);
  if (!skill || !slot) throwError(`${this.name}`, `Skill not found for ${skillIdOrSlot}`);
  skill.level += newLevel;
  if (skill.maxLevel && skill.level > skill.maxLevel) {
    skill.level = skill.maxLevel;
  }
  skill.exp += newExp;
  skill.expNeeded = newExpNeeded ?? skillExpNeeded(skill.level);
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    slot,
    skill,
  });
});
export const applySkillBoosts = selfWrap(async function applySkillBoosts(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const skillsData = data.skills || {};
  const result = {};
  for (const [slot, skill] of Object.entries(skillsData)) {
    if (!skill?.learned || !skill.id) continue;
    const logic = skills[skill.id];
    if (!logic) continue;
    if (logic.boosts && typeof logic.boosts === 'object') {
      for (const [boostType, multiplier] of Object.entries(logic.boosts)) {
        result[boostType] = (result[boostType] || 1) * multiplier;
      }
    }
    if (typeof logic.applyBoost === 'function') {
      const dynamicBoosts = logic.applyBoost(user, skill);
      if (dynamicBoosts && typeof dynamicBoosts === 'object') {
        for (const [boostType, multiplier] of Object.entries(dynamicBoosts)) {
          result[boostType] = (result[boostType] || 1) * multiplier;
        }
      }
    }
  }
  return result;
});
export const repairAllSkillObject = selfWrap(async function repairAllSkillObject(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user: ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const skillsData = (data.skills ||= {});
  const repairedDetails = [];
  for (const slot in skillsData) {
    const skill = skillsData[slot];
    if (!skill || typeof skill !== 'object' || Array.isArray(skill) || !skill.id || !skills[skill.id]) {
      repairedDetails.push({ slot, removed: true });
      delete skillsData[slot];
      continue;
    }
    const def = skills[skill.id];
    const fixed = [];
    const fix = prop => {
      if (skill[prop] !== def[prop] && def[prop] !== undefined) {
        skill[prop] = def[prop];
        fixed.push(prop);
      }
    };
    fix('name');
    fix('description');
    fix('category');
    fix('rarity');
    fix('obtainable');
    fix('id');
    if (typeof skill.level !== 'number') {
      skill.level = 1;
      fixed.push('level');
    }
    if (typeof skill.exp !== 'number') {
      skill.exp = 0;
      fixed.push('exp');
    }
    if (typeof skill.expNeeded !== 'number') {
      skill.expNeeded = skillExpNeeded(skill.level);
      fixed.push('expNeeded');
    }
    if (def.maxLevel !== undefined && skill.maxLevel !== def.maxLevel) {
      skill.maxLevel = def.maxLevel;
      fixed.push('maxLevel');
    }
    skill.learned = true;
    if (!skill.learned) {
      skill.learned = true;
      fixed.push('learned');
    }
    if (fixed.length > 0) repairedDetails.push({ slot, id: skill.id, fixed });
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    repairedCount: repairedDetails.length,
    details: repairedDetails,
  });
});

export const researchBoostList = {
  search_cooldown: ['search_cooldown'],
  search_quality: ['search_quality'],
};
export const research = selfWrap(async function research(user, id) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const tree = researchs[id];
  if (!tree) throwError(`${this.name}`, `ID ${id} not found.`);
  const complete = (data.research.complete ||= []);
  const queue = (data.research.queue ||= []);
  const levels = (data.research.levels ||= {});
  if (complete.includes(id)) return errorMsg(`research`, `${id} already completed`);
  for (const req of tree.require || []) {
    if (req.startsWith('item:')) {
      const item = req.slice(5);
      if (!hasItem(user, item)) return errorMsg(`research`, `Missing item: ${item}`);
    } else if (req.startsWith('quest:')) {
      const quest = req.slice(6);
      if (!isQuestComplete(user, quest)) return errorMsg(`research`, `Missing quest: ${quest}`);
    } else if (req.startsWith('achievement:')) {
      const ach = req.slice(12);
      if (!hasAchievement(user, ach)) return errorMsg(`research`, `Missing achievement: ${ach}`);
    } else if (!complete.includes(req)) return errorMsg(`research`, `Missing research ${req}`);
  }
  const level = (levels[id] || 0) + 1;
  const cost = typeof tree.cost === 'function' ? tree.cost(level) : tree.cost || 0;
  const duration = typeof tree.duration === 'function' ? tree.duration(level) : tree.duration;
  const coins = await getDredcoin(user);
  if (coins < cost) return errorMsg(`research`, `User ${user} don't have enough ${config.CURRENCY_NAME}.`);
  await removeDredcoin(user, cost);
  if (duration && duration > 0) queue.push({ id, level, start: Date.now(), duration });
  else {
    complete.push(id);
    levels[id] = level;
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    id,
    level,
    cost,
    queued: !!duration,
  });
});
export const completeResearchQueuesIfCan = selfWrap(async function completeResearchQueuesIfCan(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const complete = (data.research.complete ||= []);
  const queue = (data.research.queue ||= []);
  const now = Date.now();
  const completedItems = [];
  const remainingQueue = [];
  for (const queuedItem of queue) {
    const { id, level, start, duration } = queuedItem;
    const endTime = start + duration;
    if (now >= endTime) {
      if (!complete.includes(id)) {
        complete.push(id);
        const research = researchs[id];
        const dep = await resolveDependencies(research.dependencies, message);
        if (research && research.execute) await research.execute(user, research, dep);
        completedItems.push({ id, level, completedAt: now });
      }
    } else remainingQueue.push(queuedItem);
  }
  data.research.queue = remainingQueue;
  if (completedItems.length > 0) await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    completedItems,
    remainingQueueCount: remainingQueue.length,
    hasChanges: completedItems.length > 0,
  });
});
export const listResearchBoost = selfWrap(async function listResearchBoost(user, key) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const researchData = data.research || {};
  const complete = researchData.complete || [];
  const result = {};
  const boostKeys = researchBoostList[key];
  if (!boostKeys || !Array.isArray(boostKeys)) throwError(`${this.name}`, `key ${key} not found.`);
  for (const boostKey of boostKeys) {
    result[boostKey] = 1;
    for (const researchId of complete) {
      const research = researchs[researchId];
      if (research && research.boosts && typeof research.boosts === 'object' && boostKey in research.boosts) result[boostKey] *= research.boosts[boostKey];
    }
  }
  const values = Object.values(result);
  const total = values.reduce((sum, value) => {
    return typeof value === 'number' ? sum + value : sum;
  }, 0);
  return successMsg(this.name, ``, {
    user,
    keys: boostKeys,
    total: total,
  });
});
export const hasResearch = selfWrap(async function hasResearch(user, id, level) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const completed = data?.research?.complete || [];
  if (!level) return completed.includes(id) || completed.find(r => typeof r === 'object' && r.id === id);
  return completed.some(r => {
    if (typeof r === 'string') return r === id && level === 1;
    return r.id === id && r.level >= level;
  });
});
export const drawResearchTree = selfWrap(async function drawResearchTree(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user),
    queue = data.research?.queue || [],
    complete = data.research?.complete || [];
  const canvas = createCanvas(600, 400),
    ctx = canvas.getContext('2d'),
    W = canvas.width,
    H = canvas.height;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f0f1a');
  grad.addColorStop(1, '#1e1e2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x < W; x += 40) ctx.beginPath(), ctx.moveTo(x, 0), ctx.lineTo(x, H), ctx.stroke();
  for (let y = 0; y < H; y += 40) ctx.beginPath(), ctx.moveTo(0, y), ctx.lineTo(W, y), ctx.stroke();
  ctx.strokeStyle = 'rgba(0,255,255,0.05)';
  for (let i = 0; i < 6; i++) ctx.beginPath(), ctx.arc(W / 2, H / 2, 100 + i * 40, 0, Math.PI * 2), ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 20; i++) ctx.beginPath(), ctx.roundRect(randomNumber(0, W), randomNumber(0, H), 20 + randomNumber(0, 60), 10 + randomNumber(0, 30), 4), ctx.stroke();
  for (let i = 0; i < 10; i++) ctx.beginPath(), ctx.arc(randomNumber(0, W), randomNumber(0, H), 10 + randomNumber(0, 20), 0, Math.PI * 2), ctx.stroke();
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  glow.addColorStop(0, 'rgba(0, 200, 255, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x < W; x += 40) {
    const alpha = 0.05 * (1 - Math.abs(x - W / 2) / (W / 2));
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    const alpha = 0.05 * (1 - Math.abs(y - H / 2) / (H / 2));
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  for (let i = -W; i < W; i += 80) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + H, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
  }

  const spacingBaseX = 180,
    spacingBaseY = 160,
    baseNodeSize = 48,
    pos = {};
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const buildTree = (id, x, y, visited = new Set()) => {
    if (visited.has(id)) return;
    visited.add(id);
    pos[id] = [x, y];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    const children = Object.entries(researchs).filter(([cid, r]) => (r.require || []).includes(id) && !visited.has(cid));
    const totalWidth = (children.length - 1) * spacingBaseX;
    children.forEach(([cid], i) => {
      const cx = x - totalWidth / 2 + i * spacingBaseX;
      const cy = y + spacingBaseY;
      buildTree(cid, cx, cy, visited);
    });
  };
  Object.entries(researchs)
    .filter(([_, r]) => !r.require || !r.require.length)
    .forEach(([id], i, arr) => {
      const rootX = i * spacingBaseX - ((arr.length - 1) * spacingBaseX) / 2;
      buildTree(id, rootX, 0, new Set());
    });

  const padTop = 50,
    padSide = 50,
    padBottom = 120;
  const contentWidth = maxX - minX + padSide * 2,
    contentHeight = maxY - minY + padTop + padBottom;
  const scale = Math.min(W / contentWidth, H / contentHeight);
  const offsetX = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = padTop * scale - minY * scale;
  const t = (x, y) => [x * scale + offsetX, y * scale + offsetY];

  for (const [id, n] of Object.entries(researchs)) {
    const [x, y] = t(...pos[id]);
    const queueItem = queue.some(r => r.id === id);
    const inQueue = !!queueItem;
    const queueFinished = queueItem?.start && Date.now() >= queueItem.start + queueItem.duration;
    const state = complete.includes(id) || queueFinished ? 'done' : inQueue ? 'queue' : 'locked';
    const color = state === 'done' ? '#0f8' : state === 'queue' ? '#fc0' : '#88c';
    const glow = state === 'done' ? 'rgba(0,255,128,0.4)' : state === 'queue' ? 'rgba(255,200,0,0.4)' : 'rgba(80,80,255,0.2)';
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x, y, baseNodeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (const req of n.require || []) {
      const [fx, fy] = t(...pos[req]);
      const dx = x - fx,
        dy = y - fy,
        dist = Math.hypot(dx, dy);
      const ux = dx / dist,
        uy = dy / dist,
        pad = 30;
      const sx = fx + ux * pad,
        sy = fy + uy * pad;
      const ex = x - ux * pad,
        ey = y - uy * pad;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
      const angle = Math.atan2(uy, ux),
        len = 12 * scale,
        ang = Math.PI / 7;
      const count = Math.max(2, (dist / 80) | 0);
      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);
        const ax = sx + (ex - sx) * t,
          ay = sy + (ey - sy) * t;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - len * Math.cos(angle - ang), ay - len * Math.sin(angle - ang));
        ctx.lineTo(ax - len * Math.cos(angle + ang), ay - len * Math.sin(angle + ang));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  }

  for (const [k, n] of Object.entries(researchs)) {
    const [x, y] = pos[k],
      [sx, sy] = t(x, y),
      size = baseNodeSize * scale,
      h = size / 2;
    const q = queue.find(r => r.id === k),
      done = complete.includes(k),
      prog = q?.start ? Math.min((Date.now() - q.start) / q.duration, 1) : 0;
    const level = q?.level ?? (done ? n.maxLevel : 0),
      unlocked = (n.require || []).every(dep => complete.includes(dep)),
      r2 = h + 6;
    const duration = typeof n.duration === 'function' ? n.duration(level) : n.duration;
    ctx.lineWidth = 6;
    if (q?.start && !done) {
      const a0 = -Math.PI / 2,
        a1 = a0 + prog * 2 * Math.PI;
      ctx.beginPath();
      ctx.strokeStyle = '#ffe100ff';
      ctx.arc(sx, sy, r2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = '#00ff88';
      ctx.arc(sx, sy, r2, a0, a1);
      ctx.stroke();
      (ctx.fillStyle = '#fc0'), (ctx.font = `bold ${Math.round(16 * scale)}px Segoe UI`);
      const remaining = Math.max(0, q.start + q.duration - Date.now());
      ctx.fillText(`Remaining: ${formatTime(remaining)}`, sx, sy + h + 34 * scale);
    } else {
      ctx.beginPath();
      ctx.strokeStyle = done ? '#00ff88' : unlocked ? '#fc0' : '#2d2d2dff';
      ctx.arc(sx, sy, r2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, h, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(sx - h, sy - h, size, size);
    try {
      const img = await loadImage(n.icon);
      ctx.drawImage(img, sx - h, sy - h, size, size);
      if (!unlocked) (ctx.fillStyle = 'rgba(0,0,0,0.6)'), ctx.fillRect(sx - h, sy - h, size, size);
    } catch {
      ctx.fillStyle = '#222';
      ctx.fillRect(sx - h, sy - h, size, size);
    }
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(16 * scale)}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.fillText(n.name, sx, sy + h + 18 * scale);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(14 * scale)}px Segoe UI`;
    ctx.fillText(`Level ${level}/${n.maxLevel}`, sx, sy - h - 6 * scale);
    if (config.RESEARCH_SHOW_REQUIREMENTS && n.require?.length && !done && !q) {
      ctx.fillStyle = '#ccc';
      ctx.font = `bold ${Math.round(8 * scale)}px Sans-serif`;
      const reqs = n.require.map(r => researchs[r]?.name || r).join(', ');
      ctx.fillText(`Require: ${reqs}`, sx, sy - h + 6 * scale);
    }
    const cost = typeof n.cost === 'function' ? n.cost(level) : n.cost;
    if (cost && !done && !q) (ctx.fillStyle = '#ffe100ff'), (ctx.font = `bold ${Math.round(16 * scale)}px Segoe UI`), ctx.fillText(`Cost: ${await formatAmount(cost)}`, sx, sy + h + 34 * scale);
    if (duration && !done && !q) (ctx.fillStyle = '#1ed1feff'), (ctx.font = `bold ${Math.round(16 * scale)}px Segoe UI`), ctx.fillText(`Duration: ${formatTime(duration)}`, sx, sy + h + 48 * scale);
    if (config.RESEARCH_SHOW_DESCRIPTION) {
      const maxWidth = 128,
        words = n.description.split(' '),
        lines = [];
      let line = '';
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxWidth) lines.push(line.trim()), (line = word + ' ');
        else line = test;
      }
      if (line) lines.push(line.trim());
      ctx.fillStyle = '#ccc';
      ctx.font = `${Math.round(12 * scale)}px Segoe UI`;
      ctx.textAlign = 'left';
      lines.forEach((text, i) => ctx.fillText(text, sx + h + 10 * scale, sy + h - 18 * scale - (lines.length - i - 1) * 14 * scale));
    }
  }
  const buffer = canvas.toBuffer('image/png');
  const timestamp = Date.now();
  const filePath = path.join(paths.temp, `research_tree_${timestamp}.png`);
  await fs.writeFile(filePath, buffer);
  return successMsg(this.name, ``, {
    user,
    filePath,
    img: filePath,
    timestamp,
    width: W,
    height: H,
    contentWidth,
    contentHeight,
    scale,
    offsetX,
    offsetY,
    pos,
    minX,
    maxX,
    minY,
    maxY,
    padTop,
    padSide,
    padBottom,
    spacingBaseX,
    spacingBaseY,
    baseNodeSize,
  });
});
export const cleanOldResearchImages = selfWrap(async function cleanOldResearchImages(dir = './temp', maxAgeMs = 30_000) {
  const now = Date.now();
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.startsWith('research_tree_') || !file.endsWith('.png')) continue;
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      const age = now - stat.mtimeMs;
      if (age > maxAgeMs) {
        await fs.unlink(fullPath);
        log(`[-] ${this.name}: Deleted ${file}`);
      }
    }
  } catch (err) {
    log(`[-] ${this.name}: ${err}.`);
  }
});

export const giveAchievement = selfWrap(async function giveAchievement(user, achievementId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const Achievements = (data.achievements ||= {});
  if (Achievements[achievementId]) return errorMsg(`giveAchievement`, `Achievement ${achievementId} already given to user ${user}.`);
  const achievement = achievements[achievementId];
  if (!achievement) throwError(`${this.name}`, `Achievement ${achievementId} not found.`);
  Achievements[achievementId] = {
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    obtainable: achievement.obtainable || false,
    category: achievement.category,
    obtained: true,
    obtainedAt: Date.now(),
  };
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    achievementId,
    achievement: Achievements[achievementId],
  });
});
export const hasAchievement = selfWrap(async function hasAchievement(user, achievementId) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const achievements = data.achievements || {};
  return achievements.hasOwnProperty(achievementId) && achievements[achievementId].obtained;
});
export const listAchievements = selfWrap(async function listAchievements(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  const achievements = data.achievements || {};
  return Object.entries(achievements)
    .filter(([_, ach]) => ach && typeof ach === 'object' && !Array.isArray(ach) && 'id' in ach && typeof ach.id === 'string')
    .map(([id, ach]) => ({ id, ...ach }));
});
export const completeAchievementsIfCan = selfWrap(async function completeAchievementsIfCan(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const userAchievements = (data.achievements ||= {});
  const completed = [];
  for (const [key, achievement] of Object.entries(achievements)) {
    if (!achievement.obtainable) continue;
    if (userAchievements[key]?.obtained) continue;
    if (achievement.dependencies?.length) {
      const unmet = achievement.dependencies.some(dep => !userAchievements[dep]?.obtained);
      if (unmet) continue;
    }
    try {
      const qualifies = typeof achievement.need === 'function' ? await achievement.need(user, data) : false;
      if (qualifies) {
        const result = await giveAchievement(user, key);
        if (typeof achievement.execute === 'function') {
          const dep = await resolveDependencies(achievement.dependencies, message);
          await achievement.execute(user, data, dep);
          await saveData(user, data);
        }
        completed.push(result.achievement);
      }
    } catch (err) {
      throwError(`[!] Error checking achievement "${key}": ${err.message}`);
    }
  }
  return successMsg(this.name, ``, {
    user,
    completed,
  });
});

export const isQuestComplete = selfWrap(async function isQuestComplete(user, id) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  return (data.quests?.complete || []).includes(id);
});
export const getQuests = selfWrap(async function getQuests(user, { onlyObtainable = true } = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const available = [],
    inProgress = [],
    complete = [],
    locked = [];
  for (const [key, quest] of Object.entries(quests)) {
    if (onlyObtainable && !quest.obtainable) continue;
    const entry = {
      key,
      user,
      raw: quest,
      state: 'locked',
      status: '🔒',
      progress: '0%',
    };
    if (isQuestComplete(user, key)) {
      entry.state = 'complete';
      entry.status = '✅';
      entry.progress = '100%';
      complete.push(entry);
      continue;
    }
    const unmet = quest.require?.some(req => {
      const [type, value] = req.split(':');
      switch (type) {
        case 'item':
          return !hasItem(user, value);
        case 'quest':
          return !isQuestComplete(user, value);
        case 'achievement':
          return !hasAchievement(user, value);
        case 'research':
          return !hasResearch(user, value);
        default:
          return true;
      }
    });
    if (unmet) {
      locked.push(entry);
      continue;
    }
    entry.state = 'inProgress';
    const need = quest.need?.() || {};
    const values = Object.entries(need).map(([key, target]) => {
      const current = getStat?.(user, key) ?? 0;
      const percent = Math.min(Math.round((current / target) * 100), 100);
      return percent;
    });
    const avg = values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    entry.progress = values.map(v => `${v}%`).join(' / ') || '0%';
    entry.status = avg >= 100 ? '✅' : avg >= 88 ? '🕖' : avg >= 76 ? '🕕' : avg >= 63 ? '🕔' : avg >= 51 ? '🕓' : avg >= 38 ? '🕒' : avg >= 26 ? '🕑' : avg >= 13 ? '🕐' : '🕛';
    inProgress.push(entry);
    available.push(entry);
  }
  return successMsg(this.name, ``, {
    user,
    available,
    inProgress,
    complete,
    locked,
  });
});
export const getQuestsByType = selfWrap(async function getQuestsByType(type, filters = {}) {
  return Object.entries(quests)
    .filter(([_, quest]) => {
      if (!quest.obtainable) return false;
      if (!Array.isArray(quest.questTypes) || !quest.questTypes.includes(type)) return false;
      if (filters.rarity && quest.rarity !== filters.rarity) return false;
      if (filters.category && quest.category !== filters.category) return false;
      return true;
    })
    .map(([key]) => key);
});
export const giveQuest = selfWrap(async function giveQuest(user, key) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (isQuestComplete(user, key)) return false;
  await initUserObject(user);
  const data = await loadData(user);
  if (data.quests[key]) return false;
  data.quests[key] = { startedAt: Date.now() };
  await saveData(user, data);
  return true;
});
export const giveRandomQuests = selfWrap(async function giveRandomQuests(user, amount = 1, { category = null, exclude = [], onlyObtainable = true, filter = null } = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const given = [];
  const data = await loadData(user);
  data.quests ??= {};
  const pool = Object.entries(quests).filter(([key, quest]) => {
    if (onlyObtainable && !quest.obtainable) return false;
    if (exclude.includes(key)) return false;
    if (data.quests[key]) return false;
    if (isQuestComplete(user, key)) return false;
    if (category && !key.startsWith(category + '.')) return false;
    if (filter && !filter(quest)) return false;
    return true;
  });
  while (given.length < amount && pool.length > 0) {
    const index = Math.floor(randomNumber(0, pool.length));
    const [key] = pool.splice(index, 1)[0];
    giveQuest(user, key);
    given.push(key);
  }
  await saveData(user, data);
  return given;
});
export const hasQuest = selfWrap(async function hasQuest(user, key) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!key || typeof key !== 'string') return false;
  if (await isQuestComplete(user, key)) return true;
  await initUserObject(user);
  const quest = quests[key];
  if (!quest || !quest.obtainable) return false;
  let unmet = false;
  if (quest.require?.length) {
    for (const req of quest.require) {
      const [type, value] = req.split(':');
      switch (type) {
        case 'item':
          if (!(await hasItem(user, value))) unmet = true;
          break;
        case 'quest':
          if (!(await isQuestComplete(user, value))) unmet = true;
          break;
        case 'achievement':
          if (!(await hasAchievement(user, value))) unmet = true;
          break;
        case 'research':
          if (!(await hasResearch(user, value))) unmet = true;
          break;
        default:
          unmet = true;
      }
      if (unmet) break;
    }
  }
  if (unmet) return false;
  return true;
});
export const completeQuestsIfCan = selfWrap(async function completeQuestsIfCan(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  await initUserObject(user);
  const data = await loadData(user);
  let updated = false;
  const completed = [];
  for (const [id, quest] of Object.entries(quests)) {
    if (!quest.obtainable || isQuestComplete(user, id)) continue;
    let unmet = false;
    for (const req of quest.require || []) {
      const [type, value] = req.split(':');
      if ((type === 'item' && !(await hasItem(user, value))) || (type === 'quest' && !(await isQuestComplete(user, value))) || (type === 'achievement' && !(await hasAchievement(user, value))) || (type === 'research' && !(await hasResearch(user, value)))) {
        unmet = true;
        break;
      }
    }
    if (unmet) continue;
    const dep = resolveDependencies(quest.dependencies, message);
    const isDone = typeof quest.need === 'function' ? await quest.need(user, dep) : false;
    if (isDone) {
      if (typeof quest.execute === 'function') await quest.execute(user, dep);
      completeQuest(user, id);
      completed.push(id);
      updated = true;
    }
  }
  if (updated) await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    completed,
    updated,
  });
});
export const completeQuest = selfWrap(async function completeQuest(user, id, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!id) throwError(`${this.name}`, `Missing user or quest ID`);
  await initUserObject(user);
  const data = await loadData(user);
  const complete = (data.quests.complete ||= []);
  const quest = quests[id];
  if (!quest) throwError(`${this.name}`, `Quest ${id} not found.`);
  if (!complete.includes(id)) {
    if (typeof quest.execute === 'function') {
      try {
        const dep = resolveDependencies(quest.dependencies, message);
        await quest.execute(user, quest, dep);
      } catch (err) {
        throwError(`${this.name}`, `Error executing quest "${id}": ${err.message}`);
      }
    }
    complete.push(id);
    await saveData(user, data);
  }
  return true;
});
export const removeCompleteQuest = selfWrap(async function removeCompleteQuest(user, id) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `Invalid user ${user}`);
  if (!id) throwError(`${this.name}`, `Missing quest ID`);
  await initUserObject(user);
  const data = await loadData(user);
  const complete = (data.quests.complete ||= []);
  const index = complete.indexOf(id);
  if (index !== -1) complete.splice(index, 1);
  await saveData(user, data);
  return true;
});
export const removeQuest = selfWrap(async function removeQuest(user, id) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const completeIdx = data.quests.complete.indexOf(id);
  if (completeIdx !== -1) data.quests.complete.splice(completeIdx, 1);
  const activeIdx = data.quests.active.indexOf(id);
  if (activeIdx !== -1) data.quests.active.splice(activeIdx, 1);
  await saveData(user, data);
  return true;
});
// DAILY QUESTS
export const seedToday = selfWrap(async function seedToday() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
});
export const seededRandom = selfWrap(async function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(31, h + 1) | 0;
    return (h >>> 0) / 2 ** 32;
  };
});
export const setDailyQuests = selfWrap(async function setDailyQuests(user, amount = 3, filters = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const today = seedToday();
  if (data.dailyQuests.date === today) return data.dailyQuests;
  const rand = seededRandom(today);
  const allKeys = getQuestsByType('daily', filters);
  const selected = [];
  const pool = [...allKeys];
  for (let i = 0; i < amount && pool.length > 0; i++) {
    const index = Math.floor(rand() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  data.dailyQuests = {
    date: today,
    quests: selected,
    complete: [],
  };
  await saveData(user, data);
  return data.dailyQuests;
});
export const completeDailyQuests = selfWrap(async function completeDailyQuests(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const today = seedToday();
  if (!data.dailyQuests || data.dailyQuests.date !== today) await setDailyQuests(user);
  const { quests, complete } = data.dailyQuests;
  const newlyCompleted = [];
  for (const id of quests) {
    if (complete.includes(id)) continue;
    const quest = quests[id];
    if (!quest) continue;
    const dep = resolveDependencies(quest.dependencies, message);
    const isDone = await quest.execute?.(user, quest, dep);
    if (isDone) {
      complete.push(id);
      newlyCompleted.push(id);
    }
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    date: today,
    completed: complete,
    newlyCompleted,
    total: quests.length,
    done: complete.length,
  });
});
export const listDailyQuests = selfWrap(async function listDailyQuests(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const today = seedToday();
  if (!data.dailyQuests || data.dailyQuests.date !== today) await setDailyQuests(user);
  const questsToday = data.dailyQuests?.quests || [];
  const completed = data.dailyQuests?.complete || [];
  const available = [],
    inProgress = [],
    complete = [];
  for (const key of questsToday) {
    const quest = quests[key];
    if (!quest) continue;
    const entry = {
      key,
      user,
      state: 'locked',
      status: '🔒',
      progress: '0%',
    };
    if (completed.includes(key)) {
      entry.state = 'complete';
      entry.status = '✅';
      entry.progress = '100%';
      complete.push(entry);
      continue;
    }
    const need = quest.need?.() || {};
    const values = Object.entries(need).map(([statKey, target]) => {
      const current = getStat(user, statKey) ?? 0;
      const percent = Math.min(Math.round((current / target) * 100), 100);
      return percent;
    });
    const avg = values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    entry.progress = values.map(v => `${v}%`).join(' / ') || '0%';
    if (avg >= 100) {
      entry.state = 'complete';
      entry.status = '✅';
      complete.push(entry);
    } else {
      entry.state = 'inProgress';
      entry.status = avg >= 88 ? '🕖' : avg >= 76 ? '🕕' : avg >= 63 ? '🕔' : avg >= 51 ? '🕓' : avg >= 38 ? '🕒' : avg >= 26 ? '🕑' : avg >= 13 ? '🕐' : '🕛';
      inProgress.push(entry);
      available.push(entry);
    }
  }
  return successMsg(this.name, ``, {
    user,
    available,
    inProgress,
    complete,
  });
});
// WEEKLY QUESTS
export const seedThisWeek = selfWrap(async function seedThisWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${year}-W${week}`;
});
export const setWeeklyQuests = selfWrap(async function setWeeklyQuests(user, amount = 5, filters = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const thisWeek = seedThisWeek();
  if (data.weeklyQuests.date === thisWeek) return data.weeklyQuests;
  const rand = seededRandom(thisWeek);
  const allKeys = getQuestsByType('weekly', filters);
  const selected = [];
  const pool = [...allKeys];
  for (let i = 0; i < amount && pool.length > 0; i++) {
    const index = Math.floor(rand() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  data.weeklyQuests = {
    date: thisWeek,
    quests: selected,
    complete: [],
  };
  await saveData(user, data);
  return data.weeklyQuests;
});
export const completeWeeklyQuests = selfWrap(async function completeWeeklyQuests(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const thisWeek = seedThisWeek();
  if (!data.weeklyQuests || data.weeklyQuests.date !== thisWeek) await setWeeklyQuests(user);
  const { quests: weekly, complete } = data.weeklyQuests;
  const newlyCompleted = [];
  for (const id of weekly) {
    if (complete.includes(id)) continue;
    const quest = quests[id];
    if (!quest) continue;
    const dep = resolveDependencies(quest.dependencies, message);
    const isDone = await quest.execute?.(user, quest, dep);
    if (isDone) {
      complete.push(id);
      newlyCompleted.push(id);
    }
  }
  await saveData(user, data);
  return successMsg(this.name, ``, {
    user,
    week: thisWeek,
    completed: complete,
    newlyCompleted,
    total: weekly.length,
    done: complete.length,
  });
});
export const listWeeklyQuests = selfWrap(async function listWeeklyQuests(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const thisWeek = seedThisWeek();
  if (!data.weeklyQuests || data.weeklyQuests.date !== thisWeek) await setWeeklyQuests(user);
  const weekly = data.weeklyQuests?.quests || [];
  const completed = data.weeklyQuests?.complete || [];
  const available = [],
    inProgress = [],
    completeList = [];
  for (const key of weekly) {
    const quest = quests[key];
    if (!quest) continue;
    const entry = {
      key,
      user,
      state: 'locked',
      status: '🔒',
      progress: '0%',
    };
    if (completed.includes(key)) {
      entry.state = 'complete';
      entry.status = '✅';
      entry.progress = '100%';
      completeList.push(entry);
      continue;
    }
    const need = quest.need?.() || {};
    const values = Object.entries(need).map(([statKey, target]) => {
      const current = getStat(user, statKey) ?? 0;
      const percent = Math.min(Math.round((current / target) * 100), 100);
      return percent;
    });
    const avg = values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    entry.progress = values.map(v => `${v}%`).join(' / ') || '0%';
    if (avg >= 100) {
      entry.state = 'complete';
      entry.status = '✅';
      completeList.push(entry);
    } else {
      entry.state = 'inProgress';
      entry.status = avg >= 88 ? '🕖' : avg >= 76 ? '🕕' : avg >= 63 ? '🕔' : avg >= 51 ? '🕓' : avg >= 38 ? '🕒' : avg >= 26 ? '🕑' : avg >= 13 ? '🕐' : '🕛';
      inProgress.push(entry);
      available.push(entry);
    }
  }
  return successMsg(this.name, ``, {
    user,
    available,
    inProgress,
    complete: completeList,
  });
});
// MONTHLY QUESTS
export const seedThisMonth = selfWrap(async function seedThisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
});
export const setMonthlyQuests = selfWrap(async function setMonthlyQuests(user, amount = 8, filters = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const currentMonth = seedThisMonth();
  if (data.monthlyQuests.date === currentMonth) return data.monthlyQuests;
  const rand = seededRandom(currentMonth);
  const allKeys = getQuestsByType('monthly', filters);
  const selected = [];
  const pool = [...allKeys];
  for (let i = 0; i < amount && pool.length > 0; i++) {
    const index = Math.floor(rand() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  data.monthlyQuests = {
    date: currentMonth,
    quests: selected,
    complete: [],
  };
  await saveData(user, data);
  return data.monthlyQuests;
});
export const completeMonthlyQuests = selfWrap(async function completeMonthlyQuests(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const currentMonth = seedMonth();
  if (!data.monthlyQuests || data.monthlyQuests.date !== currentMonth) await setMonthlyQuests(user);
  const { quests, complete } = data.monthlyQuests;
  const newlyCompleted = [];
  for (const id of quests) {
    if (complete.includes(id)) continue;
    const quest = questsData[id];
    if (!quest) continue;
    const dep = resolveDependencies(quest.dependencies, message);
    const isDone = await quest.execute?.(user, quest, dep);
    if (isDone) {
      complete.push(id);
      newlyCompleted.push(id);
    }
  }
  await saveData(user, data);
  return successMsg(this.name, ``, 0, {
    user,
    date: currentMonth,
    completed: complete,
    newlyCompleted,
    total: quests.length,
    done: complete.length,
  });
});
export const listMonthlyQuests = selfWrap(async function listMonthlyQuests(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const currentMonth = seedMonth();
  if (!data.monthlyQuests || data.monthlyQuests.date !== currentMonth) await setMonthlyQuests(user);
  const questsList = data.monthlyQuests?.quests || [];
  const completed = data.monthlyQuests?.complete || [];
  const available = [],
    inProgress = [],
    completeList = [];
  for (const key of questsList) {
    const quest = quests[key];
    if (!quest) continue;
    const entry = {
      key,
      user,
      state: 'locked',
      status: '🔒',
      progress: '0%',
    };
    if (completed.includes(key)) {
      entry.state = 'complete';
      entry.status = '✅';
      entry.progress = '100%';
      completeList.push(entry);
      continue;
    }
    const need = quest.need?.() || {};
    const values = Object.entries(need).map(([statKey, target]) => {
      const current = getStat(user, statKey) ?? 0;
      const percent = Math.min(Math.round((current / target) * 100), 100);
      return percent;
    });
    const avg = values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    entry.progress = values.map(v => `${v}%`).join(' / ') || '0%';
    if (avg >= 100) {
      entry.state = 'complete';
      entry.status = '✅';
      completeList.push(entry);
    } else {
      entry.state = 'inProgress';
      entry.status = avg >= 88 ? '🕖' : avg >= 76 ? '🕕' : avg >= 63 ? '🕔' : avg >= 51 ? '🕓' : avg >= 38 ? '🕒' : avg >= 26 ? '🕑' : avg >= 13 ? '🕐' : '🕛';
      inProgress.push(entry);
      available.push(entry);
    }
  }
  return successMsg(this.name, ``, 0, {
    user,
    available,
    inProgress,
    complete: completeList,
  });
});
// YEARLY QUESTS
export const seedThisYear = selfWrap(async function seedThisYear() {
  return `${new Date().getFullYear()}`;
});
export const setYearlyQuests = selfWrap(async function setYearlyQuests(user, amount = 7, filters = {}) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const year = seedThisYear();
  if (data.yearlyQuests.date === year) return data.yearlyQuests;
  const rand = seededRandom(year);
  const allKeys = getQuestsByType('yearly', filters);
  const selected = [];
  const pool = [...allKeys];
  for (let i = 0; i < amount && pool.length > 0; i++) {
    const index = Math.floor(rand() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  data.yearlyQuests = {
    date: year,
    quests: selected,
    complete: [],
  };
  await saveData(user, data);
  return data.yearlyQuests;
});
export const completeYearlyQuests = selfWrap(async function completeYearlyQuests(user, message) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const year = seedYear();
  if (!data.yearlyQuests || data.yearlyQuests.date !== year) await setYearlyQuests(user);
  const { quests, complete } = data.yearlyQuests;
  const newlyCompleted = [];
  for (const id of quests) {
    if (complete.includes(id)) continue;
    const quest = questsData[id];
    if (!quest) continue;
    const dep = resolveDependencies(quest.dependencies, message);
    const isDone = await quest.execute?.(user, quest, dep);
    if (isDone) {
      complete.push(id);
      newlyCompleted.push(id);
    }
  }
  await saveData(user, data);
  return successMsg(this.name, ``, 0, {
    user,
    date: year,
    completed: complete,
    newlyCompleted,
    total: quests.length,
    done: complete.length,
  });
});
export const listYearlyQuests = selfWrap(async function listYearlyQuests(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  await initUserObject(user);
  const data = await loadData(user);
  const year = seedThisYear();
  if (!data.yearlyQuests || data.yearlyQuests.date !== year) await setYearlyQuests(user);
  const questsList = data.yearlyQuests?.quests || [];
  const completed = data.yearlyQuests?.complete || [];
  const available = [],
    inProgress = [],
    completeList = [];
  for (const key of questsList) {
    const quest = quests[key];
    if (!quest) continue;
    const entry = {
      key,
      user,
      state: 'locked',
      status: '🔒',
      progress: '0%',
    };
    if (completed.includes(key)) {
      entry.state = 'complete';
      entry.status = '✅';
      entry.progress = '100%';
      completeList.push(entry);
      continue;
    }
    const need = quest.need?.() || {};
    const values = Object.entries(need).map(([statKey, target]) => {
      const current = getStat(user, statKey) ?? 0;
      const percent = Math.min(Math.round((current / target) * 100), 100);
      return percent;
    });
    const avg = values.length ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    entry.progress = values.map(v => `${v}%`).join(' / ') || '0%';
    if (avg >= 100) {
      entry.state = 'complete';
      entry.status = '✅';
      completeList.push(entry);
    } else {
      entry.state = 'inProgress';
      entry.status = avg >= 88 ? '🕖' : avg >= 76 ? '🕕' : avg >= 63 ? '🕔' : avg >= 51 ? '🕓' : avg >= 38 ? '🕒' : avg >= 26 ? '🕑' : avg >= 13 ? '🕐' : '🕛';
      inProgress.push(entry);
      available.push(entry);
    }
  }
  return successMsg(this.name, ``, 0, {
    user,
    available,
    inProgress,
    complete: completeList,
  });
});

export const parseRank = selfWrap(async function parseRank(r) {
  if (r == null) return null;
  if (typeof r === "number") return r;
  if (typeof r === "string") {
    const parts = r.trim().split(" ");
    if (parts.length >= 2) {
      const num = parseFloat(parts.pop());
      return isNaN(num) ? null : num;
    }
    const fallback = parseFloat(r);
    return isNaN(fallback) ? null : fallback;
  }
  if (typeof r === "object" && "rank" in r) return typeof r.rank === "number" ? r.rank : parseFloat(r.rank) || null;
  return null;
});
export const normalizePerms = selfWrap(async function normalizePerms(perms) {
  if (!perms) return [];
  if (Array.isArray(perms)) return perms;
  if (typeof perms === "string") {
    return perms.split(/\s*,\s*/).map(r => {
      const match = r.match(/^(.*?)(?:\s+(-?\d+(\.\d+)?))?$/);
      return { name: match[1].trim(), rank: match[2] ? parseFloat(match[2]) : 0 };
    });
  }
  return [];
});
export const Permission = selfWrap(async function Permission(user, action, role) {
  if (!(await isValidUser(user))) return false;
  await initUserObject(user);
  action = action.toLowerCase();
  const data = await loadData(user);
  let permissions = await normalizePerms(data.Permission);
  if (action === "get") {
    if (!permissions.length) return "Guest 0";
    if (typeof role === "string") {
      if (role === "max" || role === "highest") {
        let highest = [...permissions].sort((a, b) => b.rank - a.rank)[0];
        return highest ? `${highest.name} ${highest.rank}` : "Guest 0";
      }
      if (config.RANKS.hasOwnProperty(role)) return `${role} ${config.RANKS[role]}`;
      if (config.RANKS.genders?.hasOwnProperty(role)) return role;
      const match = role.match(/^(\d+)(\+|-|=\+|=-|=|>=|<=|>|<)$/);
      if (match) {
        let baseRank = parseFloat(match[1]);
        let operator = match[2];
        let filtered = Object.entries(config.RANKS)
          .filter(([_, rank]) => {
            if (operator === "+" || operator === ">") return rank > baseRank;
            if (operator === "-" || operator === "<") return rank < baseRank;
            if (operator === "=+" || operator === ">=") return rank >= baseRank;
            if (operator === "=-" || operator === "<=") return rank <= baseRank;
            if (operator === "=" || operator === "===") return rank === baseRank;
            return false;
          })
          .map(([name, rank]) => `${name} ${rank}`)
          .join(", ");
        return filtered || "No matching roles";
      }
    }
    return permissions.map(r => `${r.name} ${r.rank}`).join(", ");
  }
  if (action === "set" || action === "add") {
    if (config.RANKS.genders?.hasOwnProperty(role)) {
      if (permissions.some(r => r.name === role)) return false;
      permissions.push({ name: role, rank: 0 });
    } else {
      if (!config.RANKS.hasOwnProperty(role)) return false;
      if (permissions.some(r => r.name === role)) return false;
      permissions.push({ name: role, rank: config.RANKS[role] });
    }
    data.Permission = permissions;
    await saveData(user, data);
    return true;
  }
  if (action === "remove" || action === "delete") {
    if (!permissions.length) return false;
    if (config.RANKS.genders?.hasOwnProperty(role)) permissions = permissions.filter(r => r.name !== role);
    else if (config.RANKS.hasOwnProperty(role)) permissions = permissions.filter(r => r.name !== role);
    else return false;
    if (permissions.length) data.Permission = permissions;
    else delete data.Permission;
    await saveData(user, data);
    return true;
  }
  return false;
});
export const isRankBetter = selfWrap(async function isRankBetter(a, b = 4) {
  const valA = parseRank(a);
  const valB = parseRank(b);
  if (valA == null || valB == null) return false;
  return valA > valB;
});
export const isRankEqual = selfWrap(async function isRankEqual(a, b) {
  const valA = parseRank(a);
  const valB = parseRank(b);
  if (valA == null || valB == null) return false;
  return valA === valB;
});

export const donateToClanVault = selfWrap(async function donateToClanVault(user, clan, amount) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const member = clanDB.prepare('SELECT 1 FROM clan_members WHERE user = ? AND clan = ?').get(user, clan);
  if (!member)
    return errorMsg(this.name, `not a member.`, 0, {
      member,
      donated: false,
    });
  const row = clanDB.prepare('SELECT data FROM clans WHERE id = ?').get(clan);
  if (!row)
    return error(this.name, `clan data not found.`, 0, {
      donated: false,
    });
  const data = JSON.parse(row.data || '{}');
  if (typeof data.vault !== 'number') data.vault = 0;
  data.vault += amount;
  clanDB.prepare('UPDATE clans SET data = ? WHERE id = ?').run(JSON.stringify(data), clan);
  return successMsg(this.name, ``, 0, {
    user,
    clan,
    donates: amount,
    donated: true,
    newVault: data.vault,
  });
});
export const joinClan = selfWrap(async function joinClan(user, clan, password = null) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const info = clanDB.prepare('SELECT data FROM clans WHERE id = ?').get(clan);
  if (!info)
    return errorMsg(this.name, `clan not found.`, 0, {
      joined: false,
    });
  const data = JSON.parse(info.data || '{}');
  if (typeof data.settings !== 'object' || data.settings === null) data.settings = {};
  const settings = data.settings;
  const isPrivate = settings.private === true;
  const approvalOnly = settings.approvalOnly === true;
  const limit = settings.memberLimit ?? Infinity;
  const hasPassword = typeof settings.password === 'string';
  const memberCount = clanDB.prepare('SELECT COUNT(*) AS total FROM clan_members WHERE clan = ?').get(clan)?.total || 0;
  const alreadyMember = clanDB.prepare('SELECT 1 FROM clan_members WHERE user = ?').get(user);
  if (alreadyMember)
    return errorMsg(this.name, `already a member`, 0, {
      joined: false,
    });
  if (memberCount >= limit)
    return errorMsg(this.name, `member limit reached.`, 0, {
      joined: false,
    });
  if (isPrivate)
    return errorMsg(this.name, `clan is private.`, 0, {
      joined: false,
    });
  if (hasPassword && settings.password !== password)
    return errorMsg(this.name, `wrong password`, 0, {
      joined: false,
    });
  if (approvalOnly) {
    const id = `${clan}-${user}`;
    clanDB.prepare('INSERT OR REPLACE INTO clan_requests (id, user, clan) VALUES (?, ?, ?)').run(id, user, clan);
    return successMsg(this.name, `pending`, 0, {
      user,
      joined: 'pending',
      clan,
    });
  }
  const id = `${clan}-${user}`;
  clanDB.prepare('INSERT INTO clan_members (id, user, clan) VALUES (?, ?, ?)').run(id, user, clan);
  return successMsg(this.name, ``, 0, {
    joined: true,
    user,
    clan,
    limit,
    memberCount,
    passwordProtected: hasPassword,
  });
});
export const leaveClan = selfWrap(async function leaveClan(user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const member = clanDB.prepare('SELECT clan FROM clan_members WHERE user = ?').get(user);
  if (!member)
    return errorMsg(this.name, `not a member.`, 0, {
      left: false,
    });
  clanDB.prepare('DELETE FROM clan_members WHERE user = ?').run(user);
  return successMsg(this.name, ``, 0, {
    user,
    clan: member.clan,
    left: true,
  });
});
export const changeClanSetting = selfWrap(async function changeClanSetting(user, clan, keyPath, value) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const existing = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!existing || existing.owner !== user)
    return errorMsg(this.name, `not a owner or clan not found.`, 0, {
      changed: false,
    });
  const data = JSON.parse(existing.data || '{}');
  if (typeof data.settings !== 'object' || data.settings === null)
    return errorMsg(this.name, `settings not initialized.`, 0, {
      changed: false,
    });
  const keys = keyPath.split('.');
  let current = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current))
      return errorMsg(this.name, `'${keys[i]}' path does not exist.`, 0, {
        changed: false,
      });
    current = current[keys[i]];
    if (typeof current !== 'object' || current === null)
      return errorMsg(this.name, `'${keys[i]}' is not an object.`, 0, {
        changed: false,
      });
  }
  const finalKey = keys.at(-1);
  if (!(finalKey in current))
    return errorMsg(this.name, `'${keyPath}' not found.`, 0, {
      changed: false,
    });
  if (keyPath === 'settings.memberLimit' && Number(value) > 50)
    return errorMsg(this.name, `memberLimit cannot exceed 50.`, 0, {
      changed: false,
    });
  current[finalKey] = value;
  clanDB.prepare('UPDATE clans SET data = ? WHERE id = ?').run(JSON.stringify(data), clan);
  return successMsg(this.name, ``, 0, {
    user,
    clan,
    changed: true,
    updatedPath: keyPath,
    newValue: value,
  });
});
export const approveJoinRequest = selfWrap(async function approveJoinRequest(requester, clan, user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!(await isValidUser(requester))) throwError(`${this.name}`, `Requester ${requester} not found.`);
  const info = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!info)
    return errorMsg(this.name, `clan not found.`, {
      approved: false,
    });
  const data = JSON.parse(info.data || '{}');
  const admins = data.settings?.admins || [];
  const isOwner = info.owner === requester;
  const isAdmin = admins.includes(requester);
  if (!isOwner && !isAdmin)
    return errorMsg(this.name, `not authorized.`, {
      approved: false,
    });
  const req = clanDB.prepare('SELECT * FROM clan_requests WHERE clan = ? AND user = ?').get(clan, user);
  if (!req)
    return errorMsg(this.name, `no request found.`, {
      approved: false,
    });
  const id = `${clan}-${user}`;
  clanDB.prepare('INSERT INTO clan_members (id, user, clan) VALUES (?, ?, ?)').run(id, user, clan);
  clanDB.prepare('DELETE FROM clan_requests WHERE clan = ? AND user = ?').run(clan, user);
  return successMsg(this.name, ``, {
    approved: true,
    clan,
    user,
  });
});
export const denyJoinRequest = selfWrap(async function denyJoinRequest(requester, clan, user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!(await isValidUser(requester))) throwError(`${this.name}`, `Requester ${requester} not found.`);
  const info = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!info)
    return errorMsg(this.name, `clan not found.`, {
      denied: false,
    });
  const data = JSON.parse(info.data || '{}');
  const admins = data.settings?.admins || [];
  const isOwner = info.owner === requester;
  const isAdmin = admins.includes(requester);
  if (!isOwner && !isAdmin)
    return errorMsg(this.name, `not authorized.`, {
      denied: false,
    });
  const result = clanDB.prepare('DELETE FROM clan_requests WHERE clan = ? AND user = ?').run(clan, user);
  return successMsg(this.name, ``, {
    denied: result.changes > 0,
    clan,
    user,
  });
});
export const kickMember = selfWrap(async function kickMember(requester, clan, user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!(await isValidUser(requester))) throwError(`${this.name}`, `Requester ${requester} not found.`);
  const info = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!info)
    return errorMsg(this.name, `clan not found.`, {
      kicked: false,
    });
  const data = JSON.parse(info.data || '{}');
  const admins = data.settings?.admins || [];
  const isOwner = info.owner === requester;
  const isAdmin = admins.includes(requester);
  if (!isOwner && !isAdmin)
    return errorMsg(this.name, `no permission.`, {
      kicked: false,
    });
  if (user === info.owner)
    return errorMsg(this.name, `cannot kick owner.`, {
      kicked: false,
    });
  const member = clanDB.prepare('SELECT 1 FROM clan_members WHERE user = ? AND clan = ?').get(user, clan);
  if (!member)
    return errorMsg(this.name, `user not in clan.`, {
      kicked: false,
    });
  clanDB.prepare('DELETE FROM clan_members WHERE user = ?').run(user);
  return successMsg(this.name, ``, {
    clan,
    kicked: true,
    user,
    by: requester,
  });
});
export const banMember = selfWrap(async function banMember(requester, clan, user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!(await isValidUser(requester))) throwError(`${this.name}`, `Requester ${requester} not found.`);
  const info = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!info)
    return errorMsg(this.name, `clan not found.`, {
      banned: false,
    });
  const data = JSON.parse(info.data || '{}');
  const admins = data.settings?.admins || [];
  const isOwner = info.owner === requester;
  const isAdmin = admins.includes(requester);
  if (!isOwner && !isAdmin)
    return errorMsg(this.name, `no permission.`, {
      banned: false,
    });
  if (!Array.isArray(data.banned)) data.banned = [];
  if (!data.banned.includes(user)) data.banned.push(user);
  clanDB.prepare('DELETE FROM clan_members WHERE user = ?').run(user);
  clanDB.prepare('DELETE FROM clan_requests WHERE user = ? AND clan = ?').run(user, clan);
  clanDB.prepare('UPDATE clans SET data = ? WHERE id = ?').run(JSON.stringify(data), clan);
  return successMsg(this.name, ``, {
    clan,
    user,
    banned: true,
    by: requester,
  });
});
export const unbanMember = selfWrap(async function unbanMember(requester, clan, user) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  if (!(await isValidUser(requester))) throwError(`${this.name}`, `Requester ${requester} not found.`);
  const info = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!info)
    return errorMsg(this.name, ``, {
      unbanned: false,
      error: '[-] unbanMember: clan not found.',
    });
  const data = JSON.parse(info.data || '{}');
  const admins = data.settings?.admins || [];
  const isOwner = info.owner === requester;
  const isAdmin = admins.includes(requester);
  if (!isOwner && !isAdmin)
    return errorMsg(this.name, `no permission.`, {
      unbanned: false,
    });
  if (!Array.isArray(data.banned)) data.banned = [];
  const index = data.banned.indexOf(user);
  if (index === -1)
    return errorMsg(this.name, `user not banned.`, {
      unbanned: false,
    });
  data.banned.splice(index, 1);
  clanDB.prepare('UPDATE clans SET data = ? WHERE id = ?').run(JSON.stringify(data), clan);
  return successMsg(this.name, ``, {
    user,
    by: requester,
    clan,
    unbanned: true,
  });
});
export const listBannedMembers = selfWrap(async function listBannedMembers(clan) {
  const row = clanDB.prepare('SELECT data FROM clans WHERE id = ?').get(clan);
  if (!row)
    return successMsg(this.name, ``, {
      banned: [],
    });
  const data = JSON.parse(row.data || '{}');
  return successMsg(this.name, ``, {
    banned: Array.isArray(data.banned) ? data.banned : [],
  });
});
export const transferClanOwnership = selfWrap(async function transferClanOwnership(currentOwner, clan, newOwner) {
  if (!(await isValidUser(newOwner))) throwError(`${this.name}`, `New owner ${newOwner} not found.`);
  if (!(await isValidUser(currentOwner))) throwError(`${this.name}`, `Current owner ${currentOwner} not found.`);
  const existing = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!existing || existing.owner !== currentOwner)
    return errorMsg(this.name, `not owner or clan not found.`, {
      transferred: false,
    });
  const member = clanDB.prepare('SELECT 1 FROM clan_members WHERE user = ? AND clan = ?').get(newOwner, clan);
  if (!member)
    return errorMsg(this.name, `new owner not a member.`, {
      transferred: false,
    });
  clanDB.prepare('UPDATE clans SET owner = ? WHERE id = ?').run(newOwner, clan);
  return successMsg(this.name, ``, {
    currentOwner,
    transferred: true,
    newOwner,
  });
});
export const isAuthorized = selfWrap(async function isAuthorized(user, clan) {
  if (!(await isValidUser(user))) throwError(`${this.name}`, `User ${user} not found.`);
  const row = clanDB.prepare('SELECT * FROM clans WHERE id = ?').get(clan);
  if (!row) return false;
  if (row.owner === user) return true;
  const data = JSON.parse(row.data || '{}');
  const admins = data.settings?.admins || [];
  return admins.includes(user);
});
export const drawClanCard = selfWrap(async function drawClanCard(clan) {
  const width = 360;
  const height = 180;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const cardColor = '#2b2d31';
  const bannerHeight = 52;
  const iconSize = 64;
  const padding = 16;
  ctx.fillStyle = cardColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 16);
  ctx.fill();
  if (clan.settings?.bannerPath) {
    try {
      const banner = await loadImage(clan.settings.bannerPath);
      ctx.drawImage(banner, 0, 0, width, bannerHeight);
    } catch {
      ctx.fillStyle = clan.settings?.color || '#555';
      ctx.fillRect(0, 0, width, bannerHeight);
    }
  } else {
    ctx.fillStyle = clan.settings?.color || '#555';
    ctx.fillRect(0, 0, width, bannerHeight);
  }
  const tagText = clan.settings?.private ? 'Private' : 'Public';
  const tagColor = clan.settings?.private ? '#ed4245' : '#3ba55d';
  ctx.font = 'bold 13px sans-serif';
  const tagWidth = ctx.measureText(tagText).width + 20;
  const tagHeight = 24;
  const tagX = width - tagWidth - 12;
  const tagY = 12;
  ctx.fillStyle = tagColor;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, tagX + tagWidth / 2, tagY + tagHeight / 2);
  const iconX = padding;
  const iconY = bannerHeight + padding;
  ctx.fillStyle = clan.settings?.color || '#777';
  ctx.beginPath();
  ctx.moveTo(iconX + 10, iconY);
  ctx.lineTo(iconX + iconSize - 10, iconY);
  ctx.quadraticCurveTo(iconX + iconSize, iconY, iconX + iconSize, iconY + 10);
  ctx.lineTo(iconX + iconSize, iconY + iconSize - 10);
  ctx.quadraticCurveTo(iconX + iconSize, iconY + iconSize, iconX + iconSize - 10, iconY + iconSize);
  ctx.lineTo(iconX + 10, iconY + iconSize);
  ctx.quadraticCurveTo(iconX, iconY + iconSize, iconX, iconY + iconSize - 10);
  ctx.lineTo(iconX, iconY + 10);
  ctx.quadraticCurveTo(iconX, iconY, iconX + 10, iconY);
  ctx.closePath();
  ctx.fill();
  if (clan.settings?.iconPath) {
    try {
      const icon = await loadImage(clan.settings.iconPath);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(iconX + 10, iconY);
      ctx.lineTo(iconX + iconSize - 10, iconY);
      ctx.quadraticCurveTo(iconX + iconSize, iconY, iconX + iconSize, iconY + 10);
      ctx.lineTo(iconX + iconSize, iconY + iconSize - 10);
      ctx.quadraticCurveTo(iconX + iconSize, iconY + iconSize, iconX + iconSize - 10, iconY + iconSize);
      ctx.lineTo(iconX + 10, iconY + iconSize);
      ctx.quadraticCurveTo(iconX, iconY + iconSize, iconX, iconY + iconSize - 10);
      ctx.lineTo(iconX, iconY + 10);
      ctx.quadraticCurveTo(iconX, iconY, iconX + 10, iconY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    } catch {}
  }
  const textX = iconX + iconSize + 16;
  const textY = iconY + 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(clan.id, textX, textY + 0);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Owner: ${clan.owner}`, textX, textY + 22);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.fillText(`${clan.memberCount} Members • ${clan.requestCount} Requests`, textX, textY + 42);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(`Donations: ${clan.vault?.toLocaleString() ?? 0}`, textX, textY + 62);
  const rawDate = clan.created || clan.Created || null;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d)) {
      const est = `Est. ${d.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(est, textX, textY + 80);
    }
  }
  const badgeBoxX = width - 88;
  const badgeBoxY = bannerHeight + 12;
  const badgeBoxWidth = 68;
  const badgeHeight = 22;
  const badges = clan.badges || [];
  for (let i = 0; i < Math.min(badges.length, 3); i++) {
    const badgeY = badgeBoxY + i * (badgeHeight + 8);
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.roundRect(badgeBoxX, badgeY, badgeBoxWidth, badgeHeight, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badges[i], badgeBoxX + badgeBoxWidth / 2, badgeY + badgeHeight / 2);
  }
  return canvas.toBuffer('image/png');
});

export const helper = {
  // --- STUFFS (SHOULD BE COMMENTED SINCE ITS BIG OBJECT) ---
  // items, skills, researchs, achievements,
  // quests, enchants, recipes, jobs, pets
  // --- USER CLAN FUNCTIONS ---
  getClanMemberCount, //(clanId)
  getClanMemberLimit, //(clanId)
  isClanPrivate, //(clanId)
  getClanRequestCount, //(clanId)
  createClan, //(owner, clan, data = "{}")
  getClan, //(clan)
  getClanByOwner, //(owner)
  getUserClan, //(user)
  getAllClans, //()
  deleteClan, //(user, clan)
  updateClanData, //(user, clan, data)
  isValidClan, //(clan)
  setClanPassword, //(owner, clan, password)
  customizeClanColor, //(owner, clan, color)
  setClanBanner, //(owner = null, clan, base64Img)
  setUpClanSettings, //(clanId)
  viewPendingClanRequests, //(user, clan)
  renameClan, //(user, clan, newName)
  getClanSettings, //(clan, keyPath = null)
  setClanIcon, //(owner = null, clan, base64Img)

  // --- DATABASE SAVING & READING ---
  readData, //(path)
  writeData, //(path, data)
  readText, //(path)
  writeText, //(path, data)
  loadData, //(userId)
  loadAllData, //()
  loadDataByAccountId, //(accountId)
  loadUsernameByAccountId, //(accountId)
  isValidUser, //(userId)
  saveData, //(userId, data)
  writeEnv, //(key, value)
  readEnv, //(key)
  envAll, //()
  quickSaveUserIdData, //(userId, newValue)
  loadDataByAccountCookie, //(cookie)
  loadUsernameByAccountCookie, //(cookie)
  loadAllUsers, //()

  // --- USER MARKETPLACE FUNCTIONS ---
  getAllListings, //()
  getListing, //(id)
  saveListing, //(listing)
  deleteListing, //(id)

  // --- DELETE MESSAGE SCHEDULER ---
  scheduleDelete, //(bot, channelId, messageId, delay = 15000)
  removeDelete, //(channelId, messageId)
  rescheduleAll, //(bot)
  deleteDmWithUser, //(bot, userId)
  deleteAllDms, //(bot)

  // --- TRADING ---
  saveTrade, //(trade)
  getTrade, //(id)
  getAllTrades, //()
  deleteTrade, //(id)
  getUserTrades, //(userId)
  cleanUpExpiredTrades, //()

  // --- ULTILS FUNCTIONS ---
  selfWrap, //(func)
  hashPassword, //(password)
  verifyPassword, //(password, hash)
  genPassword, //()
  makeKeyPair, //()
  encryptAccount, //(user, data, pub)
  decryptAccount, //(user, token, priv)
  randomNumber, //(min = 0, max = 1)
  gambleRandomNumber, //(min = 0, max = 1, multiplier = 1)
  isWifiConnected, //()
  key, //()
  errorMsg, //(func, reason, code = 0o0, rest = {})
  throwError, //(func, msg)
  successMsg, //(func, msg, code = 0o0, rest = {})
  fileexists, //(p)
  getFileContent, //(filePath)
  clearGetFileContentFiles, //(intervalMs = 10000, maxAgeMs = 30000),
  log, //(msg)
  parseAmount, //(input)
  parseBet, //(input, bal)
  formatAmount, //(num, options = {})
  isInteger, //(num)
  formatTime, //(ms)
  formatDate, //(date)
  parseDate, //(str)
  testEnv, //(envName = 'all')
  isSameDay, //(dateA, dateB)
  newToken, //(length = 16)
  toBase64, //(string)
  fromBase64, //(base64)
  toBinary, //(string)
  fromBinary, //(binary)
  toRoman, //(number)
  fromRoman, //(roman)
  toSlug, //(string)
  findAllObjectByValue, //(obj, value)
  findAllArrayByValue, //(arr, key, value)
  deepFindAllObjectKeyPaths, //(obj, targetKey)
  unicode, //(str)
  wait, //(ms)
  resolveDependencies, //(depStr)
  convertImageToBase64, //(url)
  waitForMessages, //(channel, userId, options = {})
  flagMap, //()
  formatFlags, //(bitField)
  parseFlags, //(opts)
  runCommand, //(bot, message, content)
  convertColorToHex, //(input)
  isSafeNumber, //(n)
  chalk, //(text, color = 'white')
  gradientMsg, //(msg, opts)
  Schedule, //()
  pvpEvent, //(type)
  newTab, //(shipId)
  removeTab, //(shipId)
  findTab, //(shipId)
  fetchShipList, //()
  fetchShipFromLink, //(link)
  drawShipsCard, //(ships, updateInterval, totalPlayers, maxPlayers)
  getMissionState, //()
  getFutureMission, //(count = 3)
  getDrednotLeaderboard, //(category, by = 'pilot', page = 1, formatter = 'formatDrednotLeaderboard')
  formatDrednotLeaderboard, //(data, by = 'pilot')
  getSpotifyToken, //()
  refreshSpotifyToken, //()
  searchSpotify, //(songName, artistName = "", limit = 1)
  getLocalIP, //()
  getProxyUrl, //()
  getNgrokUrl, //()
  getTax, //(amount = 0, user)
  initUserObject, //(user)
  // --- BLUEPRINTS (CREDIT TO BLUEYESCAT FOR LIBRARY) ---
  isValidBlueprint, //(bpStr)
  bluePrintCountMaterials, //(bpStr)
  bluePrintReplaceMaterial, //(bpStr, fromItem, toItem)
  blueprintListMaterials, //(bpStr)
  bluePrintRemoveMaterial, //(bpStr, targetItem)
  blueprintMostUsedMaterial, //(bpStr)
  blueprintPreview, //(bpStr, y = 0)
  blueprintCountCmdTypes, //(bpStr)
  blueprintResourceCost, //(bpStr)
  bluePrintRandomizeItems, //(bpStr)
  blueprintCompare, //(bpStrA, bpStrB)
  // --- DREDCOIN & EXP & MAX ---
  givePermanentBoost, //(user, { dredcoin = 0, exp = 0 })
  giveDredcoinBoost, //(user, multiplier, duration)
  giveDredcoin, //(user, amount)
  addDredcoin, //(user, amount)
  removeDredcoin, //(user, amount)
  setDredcoin, //(user, amount)
  getDredcoin, //(user)
  getBankBalance, //(user)
  applyDredcoinMultiplier, //(user, amount)
  applyExpMultiplier, //(user, amount)
  isMaxCoin, //(user)
  isMaxBank, //(user)
  isMaxLevel, //(user)
  getExpNeeded, //(level, user)
  getUserExpData, //(user)
  canLevelUp, //(user)
  forceLevelUp, //(user, amount = 1)
  levelUpIfCan, //(user)
  giveExp, //(user, amount)
  removeExp, //(user, amount)
  giveExpBoost, //(user, multiplier, duration)
  getExp, //(user)
  // --- PRETIGES ---
  prestigeIfCan, //(user)
  prestige, //(user)
  getPrestige, //(user)
  // --- BOOSTS ---
  isExpired, //(boost)
  deleteAllExpiredBoosts, //(user)
  deleteExpiredBoosts, //(user, boostType)
  getActiveBoosts, //(user, boostType)
  giveBoost, //(user, type, multiplier, duration)
  giveLuck, //(user, category, multiplier, durationMs)
  getLuck, //(user)
  giveLuckBoost, //(user, multiplier, durationMs)
  applyLuckBoost, //(user)
  // --- PASSIVE INCOME ---
  givePassiveIncomeBoost, //(user, multiplier, duration)
  earnPassiveIncome, //(user)
  getPassiveIncome, //(user)
  // --- COOLDOWNS ---
  giveCooldownBoost, //(user, multiplier, durationMs)
  getCooldownBoost, //(user)
  newCooldown, //(user, command, seconds)
  newGlobalCooldown, //(user, command, seconds)
  Cooldown, //(user, command)
  GlobalCooldown, //(user, command)
  resetAllCooldowns, //(user)
  resetRandomCooldown, //(user)
  doubleAllCooldowns, //(user)
  // --- STREAKS ---
  gambleStreak, //(user, streak)
  getGambleStreak, //(user)
  calcNextStreak, //(lastClaim, type)
  dailyStreak, //(user, streak, lastClaim)
  getDailyStreak, //(user)
  weeklyStreak, //(user, streak, lastClaim)
  getWeeklyStreak, //(user)
  monthlyStreak, //(user, streak, lastClaim)
  getMonthlyStreak, //(user)
  yearlyStreak, //(user, streak, lastClaim)
  getYearlyStreak, //(user)
  // --- BANKS & COIN TRADE ---
  depositDredcoin, //(user, amount)
  withdrawDredcoin, //(user, amount)
  transferDredcoin, //(userA, userB, amount)
  // --- ITEMS ---
  searchItemByIdOrName, //(inventory, query)
  isItemExistByIdOrName, //(query)
  getItemDefByIdOrName, //(query)
  resolveItem, //(inventory, itemPathOrObj)
  resolveContainer, //(inventory, pathArray)
  createNewItemStack, //(user, itemPath, count, meta)
  giveItem, //(user, itemPath, count = 1)
  transferItem, //(userA, userB, itemPath, count = 1)
  removeItem, //(user, itemPath, count = 1, removeIfZero = true)
  consumeItem, //(user, item, count, options = {})
  useItem, //(user, itemPathOrObj, count = 1, options = {}, message)
  hasItem, //(user, itemPathOrObj, minCount = 1)
  equipItem, //(user, itemPath)
  listItems, //(user, options = {})
  item, //()
  repairAllItemObject, //(user)
  getRandomItemByChance, //(user, category, range = [1, 1], options = {})
  getRandomItem, //(user, category, range = [1, 1], options = {})
  getItemsByRarity, //(category, rarity, options = {})
  reduceDurability, //(user, itemPath, amount = 1, removeIfBroken = true)
  enchantItem, //(user, itemPath, enchantId, level = 1)
  hasEnchant, //(user, itemPath, enchantId, level = null)
  getRandomEnchant, //(rarity = "common")
  getRandomEnchantByChance, //()
  enchantToItem, //(enchantObj)
  useEnchantScroll, //(user, scrollPath, targetItemPath)
  getEnchants, //(user, itemPath)
  resetEnchants, //(user, itemPath)
  removeEnchant, //(user, itemPath, enchantIdOrIndex)
  getRecipeByIdOrName, //(table, query)
  getAllRecipes, //(table)
  resolveInputToDef, //(input)
  getCraftingStatus, //(user)
  claimCraft, //(user)
  craftItem, //(user, recipeId)
  getCookingStatus, //(user)
  claimCook, //(user)
  cookItem, //(user, recipeId)
  getMeltingStatus, //(user)
  claimMelt, //(user)
  meltItem, //(user, recipeId)
  disassembleItem, //(user, itemPath, count = 1)
  disassemblePreview, //(user, item)
  reforgeItem, //(user, itemPath)
  formatItemQuality, //(quality, options = {})
  createTrade, //(fromUser, toUser, toUserConfirmed = null)
  addTradeItem, //(user, itemPath, count = 1)
  addTradeCurrency, //(user, amount = 0)
  cancelTrade, //(user)
  confirmTrade, //(user)
  declineTrade, //(user)
  getActiveTrade, //(user)
  finalizeTrade, //(user)
  getUserTradeStatus, //(user)
  autoCancelInactiveTrades, //(maxMs = 600000)
  startHatchEgg, //(user, eggPath)
  hatchEgg, //(user)
  cancelHatchEgg, //(user)
  refundEggOnCancel, //(user)
  checkHatchStatus, //(user)
  listUserEggs, //(user)
  // --- MARKETPLACE ---
  listItemForSale, //(user, itemPath, price)
  buyListing, //(buyer, listingId)
  cancelListing, //(user, listingId)
  refundExpiredListings, //()
  // --- SKILLS ---
  skillExpNeeded, //(lvl)
  searchSkillByIdOrName, //(skills, query)
  resolveSkill, //(skills, skillOrSlot)
  giveSkill, //(user, slot, skillId)
  removeSkill, //(user, slotOrSkillId)
  applySkill, //(user, slotOrSkill, message)
  listSkills, //(user)
  listSkillBoost, //(user, key)
  userAllSkillBoosts, //(user)
  allSkillBoosts, //()
  giveSkillExp, //(user, skillIdOrSlot, amount = 10)
  giveSkillLv, //(user, skillIdOrSlot, newLevel = 1, newExp = 0, newExpNeeded = null)
  applySkillBoosts, //(user)
  repairAllSkillObject, //(user)
  // --- RESEARCH ---
  research, //(user, id)
  completeResearchQueuesIfCan, //(user, message)
  listResearchBoost, //(user, key)
  hasResearch, //(user, id, level)
  drawResearchTree, //(user)
  cleanOldResearchImages, //(dir = './temp', maxAgeMs = 30_000)
  giveAchievement, //(user, achievementId)
  hasAchievement, //(user, achievementId)
  listAchievements, //(user)
  completeAchievementsIfCan, //(user, message)
  // --- QUESTS ---
  isQuestComplete, //(user, id)
  getQuests, //(user, { onlyObtainable = true } = {})
  getQuestsByType, //(type, filters = {})
  giveQuest, //(user, key)
  giveRandomQuests, //(user, amount = 1, { category = null, exclude = [], onlyObtainable = true, filter = null } = {})
  hasQuest, //(user, key)
  completeQuestsIfCan, //(user, message)
  completeQuest, //(user, id, message)
  removeCompleteQuest, //(user, id)
  removeQuest, //(user, id)
  seedToday, //()
  seededRandom, //(seed)
  setDailyQuests, //(user, amount = 3, filters = {})
  completeDailyQuests, //(user, message)
  listDailyQuests, //(user)
  seedThisWeek, //()
  setWeeklyQuests, //(user, amount = 5, filters = {})
  completeWeeklyQuests, //(user, message)
  listWeeklyQuests, //(user)
  seedThisMonth, //()
  setMonthlyQuests, //(user, amount = 8, filters = {})
  completeMonthlyQuests, //(user, message)
  listMonthlyQuests, //(user)
  seedThisYear, //()
  setYearlyQuests, //(user, amount = 7, filters = {})
  completeYearlyQuests, //(user, message)
  listYearlyQuests, //(user)
  // --- RANKING ---
  parseRank, //(r)
  normalizePerms, //(perms)
  Permission, //(user, action, role)
  isRankBetter, //(a, b = 4)
  isRankEqual, //(a, b)
  // --- CLANS ---
  donateToClanVault, //(user, clan, amount)
  joinClan, //(user, clan, password = null)
  leaveClan, //(user)
  changeClanSetting, //(user, clan, keyPath, value)
  approveJoinRequest, //(requester, clan, user)
  denyJoinRequest, //(requester, clan, user)
  kickMember, //(requester, clan, user)
  banMember, //(requester, clan, user)
  unbanMember, //(requester, clan, user)
  listBannedMembers, //(clan)
  transferClanOwnership, //(currentOwner, clan, newOwner)
  isAuthorized, //(user, clan)
  drawClanCard, //(clan)
}
