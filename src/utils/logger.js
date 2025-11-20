import config from "../config.js";
import chalk from "chalk";

const colors = {
  error: chalk.red,
  success: chalk.green,
  ok: chalk.green,
  warning: chalk.yellow,
  warn: chalk.yellow,
  title: chalk.cyan.bold,
  info: chalk.white,
};

const baseLog = async (msg, status = "info", options = {}) => {
  const { timestamp = false, uppercase = false, prefix = "" } = options;
  const colorize = colors[status] || chalk.white;
  const str = typeof msg === "object" ? JSON.stringify(msg, null, 2) : String(msg);
  let logMessage = str;
  if (uppercase) logMessage = logMessage.toUpperCase();
  if (prefix) logMessage = `${prefix} ${logMessage}`;
  if (timestamp) {
    const now = new Date().toLocaleTimeString("en-GB");
    logMessage = `[${now}] ${logMessage}`;
  }
  logMessage = colorize(logMessage);
  /*try {
    const res = await fetch(`http://localhost:${config.LOG_PORT}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log: str, status }),
    });
    if (!res.ok) throw new Error("Failed to post log");
  } catch {*/
    console.log(logMessage);
  //}
};

const logHandler = async (msg, status = "info", options = {}) => {
  await baseLog(msg, status, options);
};

const log = new Proxy(logHandler, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return async (msg, options = {}) => await baseLog(msg, prop, options);
  },
});
export default log;