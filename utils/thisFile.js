import path from "path";
import { fileURLToPath } from "url";
import paths from "./path.js";

const thisFile = function (callerUrl, mode = "relative") {
  const fullPath = fileURLToPath(callerUrl || import.meta.url);
  if (mode === "absolute") return fullPath;
  if (mode === "relative") return path.relative(paths.dirRoot, fullPath);
  if (mode === "name") return path.basename(fullPath);
  return fullPath;
};

export default thisFile;