import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import paths from '../utils/path.js';
import config from '../../config.js';

const seen = new Set();
const flatten = (obj, acc = []) => {
  for (const [_, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !('root' in value)) flatten(value, acc);
    else if (value && typeof value === 'object' && 'root' in value) {
      acc.push(path.resolve(value.root));
      flatten(value, acc);
    } else if (typeof value === 'string') acc.push(path.resolve(value));
  }
  return acc;
};
const listed = flatten(paths);
listed.forEach(p => seen.add(p));
let totalSize = 0;
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
const traverse = (dirPath, prefix = '') => {
  let entries;
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch { return }
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const entryPath = path.resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      console.log(prefix + connector + chalk.blue.bold(entry.name + '/'));
      traverse(entryPath, prefix + (isLast ? '    ' : '│   '));
    } else {
      let size = 0;
      try {
        size = fs.statSync(entryPath).size;
        totalSize += size;
      } catch {}
      const label = chalk.green(`${entry.name} (${formatSize(size)})`);
      console.log(prefix + connector + label);
    }
  });
};
const start = (obj) => {
  for (const key in obj) {
    if (config.IGNORE_PATHS.includes(key)) continue;
    const value = obj[key];
    if (value && typeof value === 'object') {
      if ('root' in value) {
        const rootPath = path.resolve(value.root);
        console.log(chalk.bold.underline(`\n/${path.basename(rootPath)}:`));
        traverse(rootPath);
      } else {
        start(value);
      }
    }
  }
};
start(paths);
console.log(`\n${chalk.green.bold('[!!!] Total Size:')} ${formatSize(totalSize)}`);
