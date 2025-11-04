import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import config from '../config.js';
import paths from '../utils/path.js';
const seen = new Set();
const flatten = (obj, acc = []) => {
  for (const [key, value] of Object.entries(obj)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !('root' in value)
    )
      flatten(value, acc);
    else if (value && typeof value === 'object' && 'root' in value) {
      acc.push(path.resolve(value.root));
      flatten(value, acc);
    } else if (typeof value === 'string') acc.push(path.resolve(value));
  }
  return acc;
};
const listed = flatten(paths);
listed.forEach((p) => seen.add(p));
const init = (obj, prefix = '') => {
  const keys = Object.keys(obj);
  keys.forEach((key, index) => {
    if (config.IGNORE_PATHS.includes(key)) return;
    const value = obj[key];
    const isObj = value && typeof value === 'object' && !Array.isArray(value);
    const connector = index === keys.length - 1 ? '└── ' : '├── ';
    const nextPrefix = prefix + (index === keys.length - 1 ? '    ' : '│   ');
    if (isObj) {
      if ('root' in value) {
        const folderPath = path.resolve(value.root);
        const included = seen.has(folderPath);
        const folderName = path.basename(folderPath);
        const folderLabel = included
          ? chalk.green.bold(`+ ${folderName}`)
          : chalk.red.bold(`- ${folderName}`);
        console.log(prefix + connector + folderLabel);
        const childObj = { ...value };
        delete childObj.root;
        init(childObj, nextPrefix, index === keys.length - 1);
        final(folderPath, nextPrefix, [...seen]);
      } else {
        console.log(prefix + connector + key);
        init(value, nextPrefix, index === keys.length - 1);
      }
    } else {
      const filePath = path.resolve(value);
      const included = seen.has(filePath);
      const fileName = path.basename(filePath);
      const fileLabel = included
        ? chalk.green.bold(`+ ${fileName}`)
        : chalk.red.bold(`- ${fileName}`);
      console.log(prefix + connector + fileLabel);
    }
  });
};
const final = (dirPath, prefix, knownPaths) => {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  entries.forEach((entry, i) => {
    const isLastEntry = i === entries.length - 1;
    const connector = isLastEntry ? '└── ' : '├── ';
    const entryPath = path.resolve(dirPath, entry.name);
    if (!seen.has(entryPath)) {
      if (entry.isDirectory()) {
        console.log(prefix + connector + chalk.red.bold(`- ${entry.name}/`));
        final(entryPath, prefix + (isLastEntry ? '    ' : '│   '), knownPaths);
      } else
        console.log(prefix + connector + chalk.red.bold(`- ${entry.name}`));
    }
  });
};
init(paths);
