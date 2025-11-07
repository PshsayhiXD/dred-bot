import express from "express";

export default ({ loadDataByAccountCookie, loadUsernameByAccountCookie, saveData }) => {
  const Router = express.Router();
  Router.post("/logout", async (req, res) => {
    const authToken = req.cookies["d_sess"];
    const data = await loadDataByAccountCookie(authToken);
    if (!data) return res.status(404).send("[+] Account cookie not found.");
    const user = data.username || await loadUsernameByAccountCookie(authToken);
    if (user) data.account.cookie = null;
    else return res.status(404).send("[+] Account username not found.")
    await saveData(user, data);
    res.clearCookie("d_sess", { httpOnly: true, secure: true, path: "/" });
    return res.status(200).send("[+] Logged out.");
  });
  return Router;
};