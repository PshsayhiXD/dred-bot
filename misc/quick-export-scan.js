import fs from "fs";

const txt = fs.readFileSync("./utils/helper.js", "utf-8");
const r=/export const (\w+)\s*=\s*(?:async\s*)?\(\s*([\s\S]*?)\s*\)\s*=>/g;
const s=new Set();
const f=[];
for(const m of txt.matchAll(r)){
 const n=m[1],a=m[2].replace(/\s+/g," ").trim();
 if(!s.has(n)){s.add(n);f.push(`  ${n},//(${a})`);}
}
console.log("export const helper = {");
console.log(f.join("\n"));
console.log("};");