import express from "express";
import crypto from "crypto";
import argon2 from "argon2";
import paths from "./../../utils/path.js";
import { pathToFileURL } from "url";
import dotenv from "dotenv";
dotenv.config({ path: paths.env });
const module = await import(pathToFileURL(paths.utils.ratelimit).href);
const ratelimit = module.default;

export default ({ loadData, saveData, log, helper }) => {
  const Router = express.Router();
  Router.post("/signup", ratelimit, async (req, res) => {
    try {
      const { username, password, token, discordId } = req.body;
      if (!username || !password || !token) return res.status(400).json({ success: false, message: "[400] Missing fields." });
      const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
      const params = new URLSearchParams();
      params.append("secret", process.env.RECAPTCHA_SECRET_KEY);
      params.append("response", token);
      const verifyRes = await fetch(verifyUrl, {
         method: "POST",
         headers: { 
          "Content-Type": "application/x-www-form-urlencoded" 
         },
         body: params,
      });
      const result = await verifyRes.json();
      if (!result.success || (result.score !== undefined && result.score < 0.5)) 
        return res.status(403).json({ success: false, message: "[403] Failed reCAPTCHA." });
      const existing = await loadData(username);
      if (existing?.account) 
        return res.status(409).json({ success: false, message: "[409] Username already exists." });
      await helper.initUserObject(username);
      const data = await loadData(username);
      const account = data.account ?? {};
      account.id = discordId;
      account.uid = crypto.randomBytes(16).toString("hex");
      account.username = username;
      account.password = await argon2.hash(password, { type: argon2.argon2id });
      account.status = "Registered";
      account.createdAt = Date.now();
      data.account = account;
      await saveData(username, data);
      log(`[+] New signup: ${username} (${discordId})`, "info");
      return res.sendFile(paths.html.dashboard);
    } catch (err) {
      log(`[-] /signup error: ${err}`, "error");
      return res.status(500).json({ success: false, message: "[500] Internal server error", err: err.message });
    }
  });
  return Router;
};