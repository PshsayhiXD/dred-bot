export default {
  name: 'decryptaccount',
  description: 'Decrypt an encrypted account file.',
  aliases: [],
  usage: '<attachment:file>',
  category: 'account',
  perm: 4,
  cooldown: 10,
  globalCooldown: 0,
  id: 55,
  dependencies: `config decryptAccount log thisFile`,
  execute: async (message, args, user, command, dep) => {
    if (!message.attachments.size) return message.react('❌');
    try {
      const attachment = message.attachments.first();
      const fileUrl = attachment.url;
      const fileName = attachment.name || 'unknown';
      const res = await fetch(fileUrl);
      if (!res.ok) return await message.author.send(`❌ [decryptaccount]: Could not fetch file "${fileName}" (HTTP ${res.status}).`).catch(() => {});
      let payloadText = await res.text();
      if (message.deletable) message.delete().catch(() => {});
      payloadText = payloadText.replace(/^\uFEFF/, '');
      if (payloadText.trim().startsWith('<?xml') || payloadText.trim().startsWith('<')) return await message.author.send(`❌ [decryptdata]: File "${fileName}" appears to be XML, not JSON. Expected a JSON file with encrypted data.`).catch(() => {});
      if (!payloadText.trim()) return await message.author.send(`❌ [decryptaccount]: File "${fileName}" is empty or contains only whitespace.`).catch(() => {});
      let payload;
      try {
        payload = JSON.parse(payloadText);
      } catch (err) {
        return await message.author.send(`❌ [decryptaccount]: Invalid JSON format in "${fileName}": ${err.message}`).catch(() => {});
      }
      if (!payload || typeof payload !== 'object') return await message.author.send(`❌ [decryptdata]: Invalid payload structure in "${fileName}". Expected a JSON object.`).catch(() => {});
      const requiredFields = ['iv', 'dta', 'tag', 'metaA', 'metaB'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      if (missingFields.length > 0) return await message.author.send(`❌ [decryptdata]: Missing required encryption fields in "${fileName}": ${missingFields.join(', ')}`).catch(() => {});
      const decryptedData = await dep.decryptAccount(payload);
      const jsonText = JSON.stringify(decryptedData, null, 2);
      if (jsonText.length > 1900) {
        await message.author.send({
          files: [
            {
              attachment: Buffer.from(jsonText, 'utf-8'),
              name: 'decrypted.json',
            },
          ],
        });
      } else await message.author.send(`\`\`\`json\n${jsonText}\n\`\`\``);
    } catch (err) {
      await message.author.send(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``).catch(() => {});
      dep.log(`[${dep.thisFile(import.meta.url)}]: ${err}`, 'error');
    }
  },
};
