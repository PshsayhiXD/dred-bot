import fs from "fs";
const file = process.argv[2];
if (!file) throw new Error("Usage: node checkparams.js <file.js>");
const txt = fs.readFileSync(file, "utf-8");
const exportedBlock = txt.match(/export\s*{([^}]+)}/s);
if (!exportedBlock) throw new Error("No export block found");
const exportedFns = exportedBlock[1].split(",").map(s => s.trim()).filter(Boolean);
const fnMap = new Map();
const fnRegex = /const (\w+)\s*=\s*(?:async\s*)?\(\s*([\s\S]*?)\s*\)\s*=>/g;
for (const m of txt.matchAll(fnRegex)) {
  const name = m[1];
  const args = m[2].replace(/\s+/g, " ").trim();
  fnMap.set(name, args);
}
for (const name of exportedFns) {
  if (fnMap.has(name)) console.log(`${name},//(${fnMap.get(name)})`);
}