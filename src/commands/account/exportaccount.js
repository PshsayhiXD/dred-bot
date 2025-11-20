export default {
  name: 'exportaccount',
  description: 'Export your account data as an encrypted file.',
  aliases: ['backupaccount'],
  usage: '',
  category: 'account',
  perm: 0,
  cooldown: 3600,
  globalCooldown: 0,
  id: 54,
  dependencies: `loadData config encryptAccount 
                 decryptAccount log thisFile`,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    const data = await dep.loadData(user);
    if (!data) return message.react('❌');
    else {
      try {
        const payload = await dep.encryptAccount(data);
        await message.author.send({
          files: [
            {
              attachment: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'),
              name: `${user}.json`,
            },
          ],
        });
      } catch (err) {
        await message.author.send(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\`.`).catch(() => {});
        dep.log(`[${dep.thisFile(import.meta.url)}]: ${err}`, 'error');
      }
    }
  },
};
