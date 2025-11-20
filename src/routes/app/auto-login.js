import express from "express";
import paths from "./../../utils/path.js";
import rateLimit from "../../utils/ratelimit.js";

export default ({ loadDataByAccountCookie, readText, log, helper }) => {
  const Router = express.Router();
  Router.post("/auto-login", rateLimit, async (req, res) => {
    try {
      const authToken = req.cookies["d_sess"];
      const sessionId = req.cookies["session_id"];
      if (!authToken || !sessionId) return res.status(401).send("[401] Missing session credentials.");
      const matchedUser = loadDataByAccountCookie(authToken);
      if (!matchedUser) return res.status(401).send("[401] Auto-login failed.");
      if (matchedUser.account?.sessionId !== sessionId) return res.status(403).send("[403] Invalid or expired session.");
      const rank = await helper.Permission(matchedUser.username, "get", "max");
      const html = helper.isRankBetter(rank, 4)
        ? await readText(paths.src.templates.admin_dashboard)
        : await readText(paths.src.templates.dashboard);
      return res.send(html);
    } catch (err) {
      log(`[-] Auto-login error: ${err.stack}`, "error");
      return res.status(500).send("[500] Internal server error");
    }
  });
  return Router;
};