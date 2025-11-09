import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import paths from "./../../utils/path.js";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
dotenv.config({ path: paths.env });
import ratelimit from "../../utils/ratelimit.js";

export default ({ loadData, saveData, loadAllData, readText, log, helper }, bot) => {
  const Router = express.Router();
  Router.post("/login", ratelimit, async (req, res) => {
    try {
      const { username, password, token } = req.body;
      const ipv4 = req.ip || req.headers["x-forwarded-for"];
      if (!token) return res.status(400).json({ success: false, message: "[400] Login failed." });
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
      const data = await loadData(username);
      const account = data?.account;
      if (!account) 
        return res.status(401).json({ success: false, message: "[401] Login failed." });
      let valid = false;
      try {
        valid = await helper.verifyPassword(password, account.password);
      } catch {
        const oldPass = account.password === password;
        if (oldPass) {
          account.password = await helper.hashPassword(password);
          await saveData(username, data);
          valid = true;
        }
      }
      if (!valid) return res.status(401).json({ success: false, message: "[401] Login failed." });
      const sessionId = crypto.randomBytes(16).toString("hex");
      const authToken = crypto.randomBytes(32).toString("hex");
      account.blockedIP ??= [];
      if (account.blockedIP.includes(ipv4)) return res.status(403).json({ success: false, message: "[403] IP blocked." });
      account.pendingLogin ??= {};
      account.pendingLogin[authToken] = { ipv4, sessionId, timestamp: Date.now(), approved: false };
      account.securityLogs ??= [];
      account.securityLogs.push({ ipv4, action: "login", ts: Date.now() });
      account.securityLogs = account.securityLogs.filter(e => Date.now() - e.ts < 48 * 60 * 60 * 1000);
      data.account = account;
      await saveData(username, data);
      const embed = new EmbedBuilder()
        .setTitle("Login Attempt Detected")
        .setDescription(`User **${username}** attempted login from **${ipv4}**.\nApprove to allow login.`)
        .setColor(0x00FFFF)
        .setFooter({ text: bot.user.username, iconURL: bot.user.displayAvatarURL() })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approveLogin-${username}-${authToken}`).setLabel("Approve").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`denyLogin-${username}-${authToken}`).setLabel("Deny").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`blockIP-${username}-${ipv4}`).setLabel("Block IP").setStyle(ButtonStyle.Secondary)
      );
      if (Object.values(account.pendingLogin || {}).some(p => p.ipv4 === ipv4 && !p.approved)) return res.status(200).json({ success: true, message: "[200] Login already pending approval." });
      const discordUser = await bot.users.fetch(account.id);
      if (discordUser) await discordUser.send({ embeds: [embed], components: [row] });
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      const html = `
      <html>
      <head><title>Login Pending Approval</title></head>
      <body>
        <h1>Login Pending Approval</h1>
        <p>Check your Discord DM to approve the login.</p>
        <p>Please enable DMs if message did not arrive.</p>
        <script>
          const a = "${authToken}";
          async function c() {
            const r = await fetch("/login/check/" + a);
            const d = await r.json();
            if (d.approved) window.location.href = "/login/final/" + a;
            else setTimeout(c, 2000);
          }
          c();
        </script>
      </body>
      </html>
      `;
      return res.send(html);
    } catch (err) {
      log(`[-] /login error: ${err.stack}`, "error");
      return res.status(500).json({ success: false, message: "[500] Internal server error", err: err.message });
    }
  });

  Router.get("/login/check/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const allUsers = await loadAllData();
      for (const user of allUsers) {
        const acc = user.account;
        if (!acc) continue;
        if (acc.pendingLogin?.[token]?.approved) return res.json({ approved: true });
      }
      return res.json({ approved: false });
    } catch (err) {
      log(`[-] /login/check error: ${err.stack}`, "error");
      return res.status(500).json({ approved: false });
    }
  });

  Router.get("/login/final/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const allUsers = await loadAllData();
      let targetUser, account;
      for (const user of allUsers) {
        if (!user.account) continue;
        if (user.account.pendingLogin?.[token]?.approved) {
          targetUser = user;
          account = user.account;
          break;
        }
      }
      if (!account) return res.status(404).send("[404] Invalid or expired token.");
      account.cookie = token;
      delete account.pendingLogin[token];
      targetUser.account = account;
      await saveData(targetUser.username, targetUser);
      res.cookie("d_sess", token, { httpOnly: true, secure: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
      const rank = await helper.Permission(targetUser.username, "get", "max");
      const html = helper.isRankBetter(rank, 4)
        ? await readText(paths.html.admin_dashboard)
        : await readText(paths.html.dashboard);
      return res.send(html);
    } catch (err) {
      log(`[-] /login/final error: ${err.stack}`, "error");
      return res.status(500).send("[500] Internal server error");
    }
  });
  return Router;
};