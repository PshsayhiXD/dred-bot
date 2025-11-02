dredbot © 2025 Pshsayhi
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

# dredbot

<p align="center">
  <img src="https://img.shields.io/github/stars/PshsayhiXD/dredbot?style=for-the-badge" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/PshsayhiXD/dredbot?style=for-the-badge" alt="GitHub forks">
  <img src="https://img.shields.io/github/issues/PshsayhiXD/dredbot?style=for-the-badge" alt="GitHub issues">
  <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Node.js-16+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Discord.js-14.22+-blue?style=for-the-badge&logo=discord" alt="Discord.js">
</p>

**dredbot** is a comprehensive, open-source Discord bot built with Node.js. It offers a robust economy system, extensive command library, item management, clans, marketplace, gambling mechanics, and more. Featuring a full web dashboard for administration and user interaction, it provides a complete Discord bot solution for gaming communities.

Inspired by the gameplay and community mechanics of [**drednot.io**](https://drednot.io), **dredbot** delivers an engaging experience with persistent economies, social systems, and administrative tools. It supports multiple languages, regional timers, automated events, and integrates with external APIs for enhanced functionality.

## ✨ Features

### 💰 Economy System

- Balance management with daily/weekly rewards
- Passive income generation
- Bank deposits and withdrawals
- Transfer system with configurable limits

### 🎮 Commands (50+ Commands)

- **Account**: Login, logout, password management, anonymous mode
- **Clan**: Create/join clans, member management, clan settings and banners
- **Economy**: Balance, daily/weekly rewards, give/transfer commands
- **Gambling**: Blackjack, coinflip, dice, slots, wheel games, and extended variants
- **Items**: Inventory management, crafting, enchanting, disassembling, reforging
- **Marketplace**: Buy/sell items with automated tick-based system
- **Moderation**: Admin tools, database management, bot restarts
- **Research**: Unlockable research tree with requirements
- **Utility**: Leaderboards, help system, weather, timezone info, and more

### Advanced Features

- **Multi-language Support**: Built-in language files for customization
- **Regional Timers**: Time zone-aware timers for global communities
- **Mission & PvP Events**: Automated timed events with notifications
- **Ship Tracking**: Integration with external ship tracking APIs
- **Research Tree**: Progressive unlocks with dependencies
- **Web Dashboard**: Localhost-based admin and user interfaces

## 🛠️ Dependencies Used

### Core Dependencies

- **Node.js** (16+): Runtime environment
- **Discord.js** (14.22+): Discord API wrapper
- **Express.js**: Web server framework
- **Better SQLite3**: Database management
- **Argon2**: Password hashing
- **Axios**: HTTP client for API integrations
- **Sharp**: Image processing
- **Canvas**: Dynamic image generation
- **WS**: WebSocket support
- **Luxon**: Date/time handling
- **MathJS**: Mathematical operations
- **Cheerio**: HTML parsing
- **Color**: Color manipulation
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Express Rate Limit**: API rate limiting
- **Cookie Parser**: Cookie handling
- **Dotenv**: Environment variable management

### Development Dependencies

- **Nodemon**: Development auto-restart

- Optional: **SSL key and certificate** (for HTTPS support in the web dashboard)

## 📋 Prerequisites

- **Node.js** (version 16 or higher recommended) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **SSL key and certificate** (optional, required for HTTPS support in the web dashboard)  
- **A Discord bot token** - Obtain from [Discord Developer Portal](https://discord.com/developers/applications)
- **CORS Anywhere** or similar proxy for API integrations (if fetching from external services to localhost)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/PshsayhiXD/dredbot.git
cd dredbot
```

### 2. Install Dependencies

```bash
npm install
```

This will install all the required dependencies listed.

And
```bash
npm run setup
```
To Setup files and database.

### 3. Configure the Bot

#### Copy Configuration Files

```bash
cp config.example.js config.js
cp .env.example .env
```

#### Edit `config.js`

Configure your bot settings:

- Set your Discord bot token
- Configure guild IDs, channel IDs, role IDs
- Adjust economy settings, timers, etc.
- Set up API keys for external services (e.g., DREDNOT_ANON_KEY)

#### Edit `.env`

Set your environment variables:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=your_oauth_redirect_uri_here
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
```

Make sure to set all the variables.

### 4. Set Up CORS Proxy (Optinal)

Since the bot integrates with external APIs (like drednot.io), you'll need to handle CORS restrictions when running on localhost. You have several options:

#### Option A: Use CORS Anywhere

1. Install CORS Anywhere globally:

   ```bash
   npm install -g cors-anywhere
   ```

2. Start the proxy server:

   ```bash
   cors-anywhere
   ```

   This will run on `http://localhost:8080` by default.

3. Update your `config.js`:
   ```javascript
   PROXY_URL: 'http://localhost:8080',
   ```

#### Option B: Use a different proxy service

You can use online CORS proxies or set up your own reverse proxy.

#### Option C: Use HTTPS with SSL key and certificate

Place your SSL key and certificate in the cert/ folder.

Update config.js to point to your files for HTTPS support:

SSL_KEY_PATH: './cert/key.pem',
SSL_CERT_PATH: './cert/cert.pem'

## ▶️ Running the Application

### Full Application (Recommended)

To run the complete bot with web server and validator:

```bash
npm run start
```

This runs all three components simultaneously:

- Discord bot
- Web server (localhost:3000)
- Data validator

### Individual Components

**Web Server Only:**

```bash
npm run localhost
```

**Discord Bot Only:**

```bash
npm run bot
```

**Validator Only:**

```bash
npm run validator
```

### Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

## Accessing the Application

- **Discord Bot**: The bot will automatically connect to Discord using your token
- **Web Dashboard**: Available at `http://localhost:3000` (configurable in config.js)
- **Admin Dashboard**: Access admin features through the web interface
- **API Endpoints**: RESTful API available for integrations

## ⚠️ Important Notes

- Ensure your CORS proxy is running if using external API integrations
- The bot requires proper Discord permissions to function correctly
- Database files will be created automatically on first run
- Make sure all environment variables are properly set before starting

## 🔧 Configuration

The `config.js` file contains all customizable settings:

### Core Settings

- **Bot Configuration**: Prefix, currency settings, bot permissions
- **Economy Parameters**: Rewards, multipliers, transfer limits, taxes
- **Server Integration**: Guild IDs, channel IDs, role IDs for Discord server

### Advanced Settings

- **Timer Intervals**: Regional timers, mission timers, marketplace ticks
- **Event Settings**: PvP events, mission configurations
- **Item System**: Rarities, crafting recipes, enchantment costs
- **API Integrations**: External service keys and endpoints

### Example Configuration Areas

```javascript
// Basic bot settings
PREFIX: 'd?',
CURRENCY_NAME: "dredcoin",
CURRENCY_SYMBOL: "⚡",

// Economy settings
DAILY_REWARD: 250,
WEEKLY_REWARD: 2000,
PASSIVE_INCOME: { BASE_PER_MINUTE: 1000 },

// Server integration
GUILD_ID: 'your_guild_id',
BotcommandChannelID: 'your_channel_id',

// API keys
DREDNOT_ANON_KEY: 'your_anon_key',
```

Refer to `config.example.js` for detailed comments on each option.

## Support & Community

### Discord Server

Join our official Discord server for:

- Real-time support and troubleshooting
- Community discussions and feature requests
- Bot updates and announcements
- Developer Q&A sessions

[![Discord](https://img.shields.io/discord/1342148647441137757?color=blue&label=Join%20Discord&logo=discord&style=for-the-badge)](https://discord.gg/yz7zsWBzQU)

### GitHub Issues

- **Bug Reports**: Use the bug report template
- **Feature Requests**: Describe your idea with use cases
- **General Questions**: Check existing issues first

[![GitHub Issues](https://img.shields.io/github/issues/PshsayhiXD/dredbot?style=for-the-badge)](https://github.com/PshsayhiXD/dredbot/issues)

## 🤝 Contributing

We welcome contributions from the community! This is an open-source project and we appreciate all forms of contribution.

### Ways to Contribute

- **Code Contributions**: Fix bugs, add features, improve documentation
- **Testing**: Report bugs, test new features, provide feedback
- **Documentation**: Improve README, add code comments, create guides
- **Translations**: Help translate the bot to new languages
- **Design**: UI/UX improvements for the web dashboard

### Contribution Process

1. **Fork the Repository**

   ```bash
   git clone https://github.com/PshsayhiXD/dredbot.git
   cd dredbot
   ```

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**

   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Test Thoroughly**

   - Run the validator: `npm run validator`
   - Test bot commands in a development server
   - Verify web dashboard functionality

5. **Submit a Pull Request**
   - Provide a clear description of your changes
   - Reference any related issues
   - Ensure all tests pass

### Development Guidelines

- Use ES6+ features and modern JavaScript practices
- Follow the existing project structure
- Add JSDoc comments for new functions
- Keep dependencies minimal and well-maintained
- Test on multiple Node.js versions when possible

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Discord.js Community**: For the excellent Discord API wrapper
- **Open Source Contributors**: Everyone who has contributed to this project
- **Beta Testers**: Users who helped test and improve the bot
- **Community**: Discord server members who provide feedback and support

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/PshsayhiXD/dredbot?style=flat-square) ![GitHub forks](https://img.shields.io/github/forks/PshsayhiXD/dredbot?style=flat-square) ![GitHub issues](https://img.shields.io/github/issues/PshsayhiXD/dredbot?style=flat-square) ![GitHub pull requests](https://img.shields.io/github/issues-pr/PshsayhiXD/dredbot?style=flat-square) ![License](https://img.shields.io/github/license/PshsayhiXD/dredbot?style=flat-square)

---

**Made with ❤️ by the dredbot development team**
