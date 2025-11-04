import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import paths from '../utils/path.js';
import config from '../../config.js';

const seen = new Set();
const flatten = (obj, acc = []) => {
  for (const [_, value] of Object.entries(obj)) {
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
const VALID_EXTENSIONS = [
  '.js',
  '.ts',
  '.json',
  '.md',
  '.html',
  '.css',
  '.jsx',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
];
const countLines = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
};
let totalLines = 0;
const traverse = (dirPath, prefix = '', knownPaths = seen) => {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const entryPath = path.resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      console.log(prefix + connector + chalk.blue.bold(entry.name + '/'));
      traverse(entryPath, prefix + (isLast ? '    ' : '│   '), knownPaths);
    } else {
      const ext = path.extname(entry.name);
      const isValid = VALID_EXTENSIONS.includes(ext);
      const lineCount = isValid ? countLines(entryPath) : 0;
      totalLines += lineCount;
      const label = isValid
        ? chalk.green(`+ ${entry.name} (${lineCount} lines)`)
        : chalk.gray(`- ${entry.name}`);
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

console.log(`\n${chalk.green.bold('[!!!] Total Lines:')} ${totalLines}`);
