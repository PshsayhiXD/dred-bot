import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get the current weather for a city.')
    .addStringOption(option => option.setName('city').setDescription('City name').setRequired(true))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: `readEnv commandEmbed log thisFile`,
  async execute(interaction, user, dep) {
    const city = interaction.options.getString('city');
    const apiKey = await dep.readEnv('OPENWEATHER_API_KEY');
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    await interaction.deferReply();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`[/weather res] API error: ${res.statusText}`);
      const data = await res.json();
      const weather = data.weather[0];
      const temp = data.main.temp;
      const feels = data.main.feels_like;
      const humidity = data.main.humidity;
      const wind = data.wind.speed;
      const embed = await dep.commandEmbed({
        title: `Weather in ${data.name}, ${data.sys.country}`,
        description: `🌤️ **Condition**: \`${weather.main}\` (${weather.description})\n
          🌡️ **Temperature**: \`${temp}°C\` (**feels like** ${feels}°C)\n
          💧 **Humidity**: \`${humidity}%\`\n
          💨 **Wind**: \`${wind} m/s\`
          🕒 **Last update**: ${new Date(data.dt * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`,
        reward: false,
        user,
        message: interaction,
      });
      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return interaction.editReply({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\`` });
    }
  },
};
