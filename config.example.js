const config = {
  IGNORE_PATHS: [
    'node_modules',
    '.git',
    'certs',
    'package.json',
    'package-lock.json',
    '.gitignore',
    'command-prompt',
    '.prettierrc',
    'database',
    'archive',
    'ae.py',
    '.env',
    '.env.example',
    '.vscode',
  ],
  LOG_PORT: 3072,
  HTTPS_PORT: 3002,
  WSS_PORT: 3002,
  LOCALHOST_PORT: 3000,
  SSL_KEY_PATH: './certs/key.pem',
  SSL_CERT_PATH: './certs/cert.pem',
  CERT_PASSPHRASE: 'DREDBOTONTOP',
  PREFIX: 'd?',
  CURRENCY_SYMBOL: "⚡",
  CURRENCY_NAME: "dredcoin",
  HELP_MAX_COMMAND_PERPAGE: 20,
  DAILY_REWARD: 250,
  DAILY_REWARD_INCREMENT_PERCENT: 1.25,
  WEEKLY_REWARD: 2000,
  WEEKLY_REWARD_INCREMENT_PERCENT: 5,
  PRESTIGE_DIFFICULTY_PERCENT: 10,
  EXPNEEDED_BASE: 100,
  EXPNEEDED_MULTIPLIER_AFTER_LEVEL: {
    0: 1.25,
    10: 1.5,
    20: 1.5,
    30: 1.5,
    40: 1.5,
    50: 2,
    60: 2,
    70: 2,
    80: 2,
    90: 2,
    100: 3,
  },
  PASSIVE_INCOME: {
    MULTIPLIER_PER_PRESTIGE: 2.5,
    BASE_PER_MINUTE: 1000,
    EXP_BASE_PER_MINUTE: 5,
  },
  ENCHANT_COST: (user, item, enchantId) => {
    if (enchantId.startsWith("rare.")) return { dredcoin: 50000 };
    return { dredcoin: 10000 };
  },
  REFORGE_COST: (user, item) => {
    if (item.rarity === "epic") return { item: "materials.reforge_stone", count: 2 };
    return { dredcoin: 10000 };
  },
  REGIONAL_TIMER_INTERVAL: 1,
  REGIONAL_TIMER: [
    { name: '🇺🇸 USA (Pacific)', tz: 'America/Los_Angeles' },
    { name: '🇺🇸 USA (Eastern)', tz: 'America/New_York' },
    { name: '🇨🇦 Canada (Toronto)', tz: 'America/Toronto' },
    { name: '🇬🇧 United Kingdom', tz: 'Europe/London' },
    { name: '🇩🇪 Germany', tz: 'Europe/Berlin' },
    { name: '🇷🇺 Russia (Moscow)', tz: 'Europe/Moscow' },
    { name: '🇻🇳 Vietnam', tz: 'Asia/Ho_Chi_Minh' },
    { name: '🇨🇳 China', tz: 'Asia/Shanghai' },
    { name: '🇯🇵 Japan', tz: 'Asia/Tokyo' },
    { name: '🇮🇳 India', tz: 'Asia/Kolkata' },
    { name: '🇧🇷 Brazil', tz: 'America/Sao_Paulo' },
    { name: '🇦🇺 Australia (Sydney)', tz: 'Australia/Sydney' }
  ],
  BEG_MIN: 1,
  BEG_MAX: 1000,
  MAX_DREDCOIN: false, // false to disable or number to set max dredcoin a user can have
  MAX_BANK: false,     // false to disable or number to set max bank a user can have
  MAX_LEVEL: false,    // false to disable or number to set max level a user can have
  MAX_TRANSFER:false,  // false to disable or number to set max transfer amount
  TAX: false,          // false to disable or number to set percent tax
  COMMANDS_REWARD: [1,10,1,100], // false to disable or [xpmin, xpmax, dredcoinmin, dredcoinmax] to set range of reward for executing commands
  RESEARCH_SHOW_DESCRIPTION: false, // false to disable or true to enable showing research description in research tree
  RESEARCH_SHOW_REQUIREMENTS: true, // false to disable or true to enable showing research requirements in research tree
  CLEAN_RESEARCH_TREE_MS: 30000, // time in ms to clean research tree cache
  MAX_CHANGELOG_AGE: 3,          // days
  PROXY_URL: 'http://localhost:8080', // Proxy url if u use that
  GUILD_ID: '0',
  NEWMEMBER_ROLEID: '0',
  WelcomeChannelID: '0',
  RulesChannelID: '0',
  BotcommandChannelID: '0',
  dashboardChannelID: '0',
  reactionRoleChannelID: '0',
  RegionalTimerChannelID: '0',
  changelogsChannelID: '0',
  MissionTimerChannelID: '0',
  PvpEventChannelID: '0',
  ShipTrackerChannelID: '0',
  statusChannelID: '0',
  AdminCommandChannelID: '0',
  CurrentVersionChannelID: '0',
  BotAvatarURL: '0',
  ReactionRoles: {
    '👾': { label: 'Discord Bot Updates', role: '0' },
    '🤖': { label: 'Dredbot Updates', role: '0' },
    '🟢': { label: 'Dredbot Online', role: '0' },
    '⚔️': { label: 'PvP Event', role: '0' }
  },
  RARITIES: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical', 'secret', 'transcendent'],
  ITEM_RARITY_CHANCE: {},
  ALLOWED_ITEM_CATEGORIES: ['consumable', 'crop', 'fish', 'seed', 'tool'],
  PvpEventPingRoleID: '0',
  MISSION_START_TS: 1756201238,
  MISSION_TIMER_INTERVAL: 5,
  MISSION_SHOW_FUTURE: 5,
  MISSION_CLOSE_DURATION: 15 * 60,
  MISSION_OPEN_DURATION: 30 * 60,
  DREDNOT_ANON_KEY: 'your drednot key',
  SHIP_TRACKER_INTERVAL: 30,
  SHIP_LINK_REFRESH_INTERVAL: 60,
  MARKETPLACE_TICKRATE: 10 * 60,
}
const makeRarityChance = (weights) => Object.fromEntries(config.RARITIES.map((r, i) => [r, weights[i] || 0]));
config.ITEM_RARITY_CHANCE.default = makeRarityChance([45, 30, 15, 5, 2, 1.5, 1, 0.5]);
config.ITEM_RARITY_CHANCE.consumable = makeRarityChance([50, 25, 12, 7, 3, 2, 0.5, 0.5]);
config.ITEM_RARITY_CHANCE.tool = makeRarityChance([20, 20, 30, 15, 10, 3, 1, 1]);
config.ITEM_RARITY_CHANCE.material = makeRarityChance([60, 25, 10, 4, 0.5, 0.3, 0.1, 0.1]);

export default config;