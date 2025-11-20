import fs from "fs";
import path from "path";
import config from "../config.js";
import paths from "../utils/path.js";
import log from "../utils/logger.js";
import { drawShipsCard, fetchShipList, fetchShipFromLink } from "../utils/helper.js";
import { commandButtonComponent, commandSelectComponent, sendChunks, commandAttachment } from "../utils/commandComponent.js";
import thisFile from "../utils/thisFile.js";
const activeship = paths.database.active_ship;
export let submittedLinks = new Map();

export const loadSubmittedLinks = () => {
  try {
    if (!fs.existsSync(activeship)) return;
    const raw = fs.readFileSync(activeship, "utf-8");
    const json = JSON.parse(raw);
    submittedLinks = new Map(Object.entries(json));
    log(`[${thisFile(import.meta.url)}] loaded ${submittedLinks.size} ship links from database.`, "success");
  } catch (err) {
    log(`[${thisFile(import.meta.url)}] failed to load submitted links: ${err.message}`, "error");
  }
};

export const saveSubmittedLinks = () => {
  try {
    const obj = Object.fromEntries(submittedLinks);
    fs.mkdirSync(path.dirname(activeship), { recursive: true });
    fs.writeFileSync(activeship, JSON.stringify(obj, null, 2));
  } catch (err) {
    log(`[${thisFile(import.meta.url)}] failed to save submitted links: ${err.message}`, "error");
  }
};

const setupShipTracker = async bot => {
  if (global.shipTrackerRunning) return;
  global.shipTrackerRunning = true;
  loadSubmittedLinks();
  const channel = await bot.channels.fetch(config.ShipTrackerChannelID);
  if (!channel?.isTextBased()) return log(`[${thisFile(import.meta.url)}]: Invalid channel.`, "warn");
  async function update() {
    const data = await fetchShipList();
    if (!data) return;
    try {
      let fetched;
      do {
        fetched = await channel.messages.fetch({ limit: 2 });
        if (fetched.size > 0) await channel.bulkDelete(fetched, true);
      } while (fetched.size >= 2);
      if (!data.ships || Object.keys(data.ships).length === 0)
        return await channel.send("No ships online. _Empty skies_");
      const sortedShips = [
        ...Object.entries(data.ships).map(([id, ship], idx) => ({
          ...ship,
          ship_id: id,
          ourId: idx + 1,
        })),
        ...[...submittedLinks.entries()]
          .filter(([_, v]) => v.valid && v.data?.shipName)
          .map(([link, v], idx) => ({
            shipName: v.data.shipName,
            shipLink: link,
            ship_id: null,
            ourId: Object.keys(data.ships).length + idx + 1,
            color: "rgb(100,100,100)",
          })),
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
      const attachment = await commandAttachment(canvas.toBuffer("image/png"), "ships.png");
      const ts = Math.floor(Date.now() / 1000);
      const submittedOptions = [...submittedLinks.entries()]
        .filter(([_, v]) => v.valid && v.data?.shipName)
        .map(([link, v]) => ({
          label: v.data.shipName,
          description: link,
          value: link,
        }));

      const baseButtons = await commandButtonComponent([
        { label: "⬇️ Download JSON", style: 2, customId: "shiptracker_download_json" },
        { label: "🔍 Search Ship", style: 1, customId: "shiptracker_search" },
        { label: "🚀 Submit Ship Link", style: 1, customId: "shiptracker_submit" },
      ]);

      const components = [...baseButtons];
      if (submittedOptions.length > 0) {
        const selectMenus = await commandSelectComponent({
          customId: "shiptracker_submitted_ships",
          placeholder: "📜 Submitted Ships",
          options: [
            {
              label: "Last Refresh",
              description: new Date().toLocaleString(),
              value: "last_refresh",
              default: true,
            },
            ...submittedOptions,
          ],
        });
        components.push(...selectMenus);
      }

      await sendChunks(channel, {
        embeds: [],
        files: [attachment],
        components,
        content: `<t:${ts}:R>`,
      }, false);
    } catch (err) {
      log(`[${thisFile(import.meta.url)}]: ${err.message}`, "error");
    }
  }

  setInterval(async () => {
    for (const [link] of submittedLinks) {
      const data = await fetchShipFromLink(link);
      if (!data) submittedLinks.set(link, { valid: false, data: null });
      else submittedLinks.set(link, { valid: true, data });
    }
    saveSubmittedLinks();
  }, config.SHIP_LINK_REFRESH_INTERVAL * 1000);
  await update();
  setInterval(update, config.SHIP_TRACKER_INTERVAL * 1000);
  log(`[${thisFile(import.meta.url)}] registered, updates every ${config.SHIP_TRACKER_INTERVAL}s.`, "success");
};

export default setupShipTracker;