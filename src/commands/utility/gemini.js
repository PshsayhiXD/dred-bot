export default {
  name: 'gemini',
  description: 'Ask Gemini flash a question.',
  usage: '<question>',
  aliases: ['gptg', 'askg'],
  category: 'utility',
  cooldown: 15,
  globalCooldown: 1,
  perm: 0,
  id: 13,
  dependencies: `commandEmbed readEnv log config thisFile`,
  execute: async (message, args, user, command, dep) => {
    const input = args.join(' ');
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `Generating... Please be patient...`,
      user,
      reward: false,
      message,
    });
    const sent = await message.reply({ embeds: [embed] });
    const key = await dep.readEnv('GEMINI_API_KEY');
    let reply = '';
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input }] }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
        reply = '❌ Failed to get a response from Gemini.';
      } else {
        const json = await res.json();
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
      }
    } catch (err) {
      log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      reply = '❌ An unexpected error occurred while contacting Gemini.';
    }
    const resultEmbed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${args}`,
      description: reply.length > 3900 ? reply.slice(0, 3900) + '...' : reply,
      user,
      reward: true,
      message,
    });
    return sent.edit({ embeds: [resultEmbed] });
  },
};
