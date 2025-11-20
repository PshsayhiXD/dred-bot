import express from 'express';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import paths from '../../utils/path.js';
export default ({ loadData, log }, bot) => {
  const Router = express.Router();
  Router.get('/forgot-password', (req, res) => {
    res.sendFile(paths.public.forgotpass);
  });
  Router.post('/forgot-password', async (req, res) => {
    try {
      const { username } = req.body;
      const ipv4 = req.ip || req.headers['x-forwarded-for'];
      if (!username) return res.status(400).json({ success: false, message: '[400] Missing username.' });
      const user = await loadData(username);
      if (!user) return res.status(404).json({ success: false, message: '[404] User not found.' });
      user.account.blockedIP ??= [];
      if (user.account.blockedIP.includes(ipv4)) return res.status(403).json({ success: false, message: '[404] User Not Found.' });
      const embed = new EmbedBuilder()
        .setTitle('Password Reset Requested')
        .setDescription(`A **password reset** was requested from **\`${ipv4}\`**.\nWould you like to proceed?`)
        .setColor(0xFFA500)
        .setFooter({
          text: bot.user.username,
          iconURL: bot.user.displayAvatarURL()
        })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`resetpw-${username}`)
          .setLabel('Reset Password')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`blockip-${username}-${ipv4}`)
          .setLabel('Block IP')
          .setStyle(ButtonStyle.Danger)
      );
      const id = await bot.users.fetch(user.account.id);
      if (!id) return res.status(404).json({ success: false, message: '[404] Discord user not found.' });
      await id.send({ embeds: [embed], components: [row] });
      log(`[!] Sent reset password DM to ${username} from IP ${ipv4}`);
      return res.status(200).json({ success: true, message: '[200] Please check your DM.' });
    } catch (err) {
      log(`[-] Error in /forgot-password: ${err}`, 'error');
      return res.status(500).json({ success: false, message: '[500] Internal server error', err: err.message });
    }
  });
  return Router;
};