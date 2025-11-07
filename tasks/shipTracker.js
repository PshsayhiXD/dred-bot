import fs from "fs";
import path from "path";
import config from "../config.js";
import paths from "../utils/path.js";
import log from "../utils/logger.js";
import { AttachmentBuilder } from "discord.js";
import { commandButtonComponent, commandSelectComponent, commandEmbed } from "../utils/commandComponent.js";
import { fetchShipList, fetchShipFromLink, drawShipsCard } from '../utils/helper.js';

const activeship = paths.database.active_ship;
export let submittedLinks = new Map();
let trackerMessage = null;
export const loadSubmittedLinks = () => {
  try {
    if (!fs.existsSync(activeship)) return;
    const raw = fs.readFileSync(activeship, "utf-8");
    const json = JSON.parse(raw);
    submittedLinks = new Map(Object.entries(json));
    log(`[shipTracker.js] loaded ${submittedLinks.size} ship links from database.`, "success");
  } catch (err) {
    log(`[shipTracker.js] failed to load submitted links: ${err.message}`, "error");
  }
};
export const saveSubmittedLinks = () => {
  try {
    const obj = Object.fromEntries(submittedLinks);
    fs.mkdirSync(path.dirname(activeship), { recursive: true });
    fs.writeFileSync(activeship, JSON.stringify(obj, null, 2));
  } catch (err) {
    log(`[shipTracker.js] failed to save submitted links: ${err.message}`, "error");
  }
};
const setupShipTracker = async (bot) => {
  loadSubmittedLinks();
  const channel = await bot.channels.fetch(config.ShipTrackerChannelID);
  if (!channel?.isTextBased()) return log('[setupShipTracker]: Invalid channel.', 'warn');
  const update = async () => {
    try {
      const data = await fetchShipList();
      if (!data) return;
      const sortedShips = [
        ...Object.entries(data.ships || {}).map(([id, ship], idx) => ({ ...ship, ship_id: id, ourId: idx + 1 })),
        ...[...submittedLinks.entries()]
          .filter(([_, v]) => v.valid && v.data?.shipName)
          .map(([link, v], idx) => ({
            shipName: v.data.shipName,
            shipLink: link,
            ship_id: null,
            ourId: Object.keys(data.ships || {}).length + idx + 1,
            color: 'rgb(100,100,100)',
          }))
      ].sort((a, b) => {
        if (a.player_count != null && b.player_count != null) return a.player_count - b.player_count;
        if (a.player_count != null) return -1;
        if (b.player_count != null) return 1;
        return 0;
      });
      const canvas = await drawShipsCard(
        sortedShips,
        config.SHIP_TRACKER_INTERVAL,
        data.max_player_count ? data.total_player_count : undefined,
        data.max_player_count ? data.max_player_count : undefined
      );
      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'ships.png' });
      const ts = Math.floor(Date.now() / 1000);
      const submittedOptions = [...submittedLinks.entries()]
        .filter(([_, v]) => v.valid && v.data?.shipName)
        .slice(0, 25)
        .map(([link, v]) => ({ label: v.data.shipName, description: link, value: link }));
      const buttonRows = await commandButtonComponent([
        { customId: 'shiptracker_download_json', label: '⬇️ Download JSON', style: 2 },
        { customId: 'shiptracker_search', label: '🔍 Search Ship', style: 1 },
        { customId: 'shiptracker_submit', label: '🚀 Submit Ship Link', style: 1 }
      ]);
      let selectRows = [];
      if (submittedOptions.length > 0) {
        selectRows = await commandSelectComponent([{
          placeholder: '📜 Submitted Ships',
          options: [
            { label: 'Last Refresh', value: 'last_refresh', description: new Date().toLocaleString(), default: true },
            ...submittedOptions
          ]
        }]);
      }
      const messagePayload = {
        content: `<t:${ts}:R>`,
        files: [attachment],
        components: [...buttonRows, ...selectRows]
      };
      if (trackerMessage) await trackerMessage.edit(messagePayload);
      else trackerMessage = await channel.send(messagePayload);
    } catch (err) {
      log(`[shipTracker.js]: ${err.stack}`, 'error');
    }
  };
  setInterval(async () => {
    for (const [link] of submittedLinks) {
      const data = await fetchShipFromLink(link);
      submittedLinks.set(link, { valid: !!data, data: data || null });
    }
    saveSubmittedLinks();
  }, config.SHIP_LINK_REFRESH_INTERVAL * 1000);
  await update();
  setInterval(update, config.SHIP_TRACKER_INTERVAL * 1000);
  log(`[shipTracker] registered, updates every ${config.SHIP_TRACKER_INTERVAL}s.`, "success");
};

export default setupShipTracker;