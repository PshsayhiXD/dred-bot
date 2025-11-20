export default {
  name: 'weather',
  description: 'Get the current weather.',
  aliases: ['wthr', 'forecast'],
  usage: '<city>',
  category: 'utility',
  perm: 0,
  cooldown: 2,
  globalCooldown: 5,
  id: 14,
  dependencies: `commandEmbed readEnv config thisFile`,
  execute: async (message, args, user, command, dep) => {
    const city = args.join(' ');
    const apiKey = await dep.readEnv('OPENWEATHER_API_KEY');
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`[weather] API error: ${res.statusText}`);
      const data = await res.json();
      const weather = data.weather[0];
      const temp = data.main.temp;
      const feels = data.main.feels_like;
      const humidity = data.main.humidity;
      const wind = data.wind.speed;
      const embed = await dep.commandEmbed({
        title: `Weather in ${data.name}, ${data.sys.country}`,
        description: `🌤️ **Condition**: ${weather.main} (${weather.description})\n
          🌡️ **Temperature**: \`${temp}°C\` (**feels like** ${feels}°C)\n
          💧 **Humidity**: \`${humidity}%\`\n
          💨 **Wind**: \`${wind} m/s\`
          🕒 **Last update**: ${new Date(data.dt * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`,
        thumbnail: `https://openweathermap.org/img/wn/${weather.icon}@2x.png`,
        color: '#00FF00',
        user,
        reward: false,
        message,
      });
      message.reply({ embeds: [embed] });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
    }
  },
};
