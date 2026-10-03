const scrapr = require("../scrapr");
const axios = require("axios");
const { InputFile } = require("grammy");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Platform Config ──

const PLATFORMS = [
  {
    id: "youtube_playlist",
    label: "▶️ YouTube Playlist",
    pattern: /youtube\.com\/playlist/i,
    module: scrapr.youtube,
    methods: ["playlist"],
    isPlaylist: true,
  },
  {
    id: "youtube",
    label: "▶️ YouTube",
    pattern: /youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/|music\.youtube\.com\//i,
    module: scrapr.youtube,
    methods: ["ytmp3", "ytmp3gg"],
    hasFormat: true,
  },
  {
    id: "tiktok",
    label: "🎵 TikTok",
    pattern: /tiktok\.com/i,
    module: scrapr.tiktok,
    methods: ["snaptik", "tiktokio", "ssstik", "savetik", "tikdownloader"],
  },
  {
    id: "instagram",
    label: "📸 Instagram",
    pattern: /instagram\.com\//i,
    module: scrapr.instagram,
    methods: ["direct", "indown", "snapsave", "snapinsta"],
  },
  {
    id: "twitter",
    label: "🐦 Twitter/X",
    pattern: /(?:twitter\.com|x\.com)\//i,
    module: scrapr.twitter,
    methods: ["direct", "tweeload", "tvd", "savetwt"],
  },
  {
    id: "spotify",
    label: "🎧 Spotify",
    pattern: /open\.spotify\.com\//i,
    module: scrapr.spotify,
    methods: ["spotmate", "spotidown", "soundloaders", "spotisaver"],
  },
  {
    id: "facebook",
    label: "📘 Facebook",
    pattern: /facebook\.com\/|fb\.watch\//i,
    module: scrapr.facebook,
    methods: ["snapsave", "fdown"],
  },
  {
    id: "pinterest",
    label: "📌 Pinterest",
    pattern: /pinterest\.com\//i,
    module: scrapr.pinterest,
    methods: ["direct", "pindown"],
  },
  {
    id: "soundcloud",
    label: "☁️ SoundCloud",
    pattern: /soundcloud\.com\//i,
    module: scrapr.soundcloud,
    methods: ["klickaud"],
  },
  {
    id: "bandcamp",
    label: "🎸 Bandcamp",
    pattern: /bandcamp\.com\//i,
    module: scrapr.bandcamp,
    methods: ["bandcampdownloader"],
  },
  {
    id: "threads",
    label: "🧵 Threads",
    pattern: /threads\.net\//i,
    module: scrapr.threads,
    methods: ["threadster"],
  },
  {
    id: "applemusic",
    label: "🍎 Apple Music",
    pattern: /music\.apple\.com\//i,
    module: scrapr.applemusic,
    methods: ["aplmate"],
  },
  {
    id: "bilibili",
    label: "📺 Bilibili",
    pattern: /bilibili\.com\//i,
    module: scrapr.bilibili,
    methods: ["direct"],
  },
  {
    id: "douyin",
    label: "🎭 Douyin",
    pattern: /douyin\.com/i,
    module: scrapr.douyin,
    methods: ["direct"],
  },
  {
    id: "pixiv",
    label: "🎨 Pixiv",
    pattern: /pixiv\.net\//i,
    module: scrapr.pixiv,
    methods: ["ajax"],
  },
  {
    id: "rednote",
    label: "📕 RedNote",
    pattern: /rednote\.com\/|xiaohongshu\.com\//i,
    module: scrapr.rednote,
    methods: ["direct"],
  },
  {
    id: "reddit",
    label: "🤖 Reddit",
    pattern: /reddit\.com\//i,
    module: scrapr.reddit,
    methods: ["rapidsave"],
  },
  {
    id: "terabox",
    label: "📦 TeraBox",
    pattern: /terabox\.com\//i,
    module: scrapr.terabox,
    methods: ["sechno"],
  },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

function normalizeUrl(url) {
  if (!url) return url;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }
  return url;
}

// ── Scraper with Fallback Chain ──

async function scrapeMedia(platform, url, options = {}) {
  const cleanUrl = normalizeUrl(url);
  const errors = [];
  const formatStr = typeof options === "string" ? options : (options.format || "mp4");
  const optionsObj = typeof options === "object" ? { format: formatStr, ...options } : { format: formatStr };

  for (const methodName of platform.methods) {
    try {
      const fn = platform.module[methodName];
      if (!fn) continue;

      console.log(`[engine] Mencoba ${platform.id}.${methodName} untuk ${cleanUrl}...`);

      // Coba panggil dengan format string atau options object sesuai ekspektasi scraper
      let result;
      if (platform.hasFormat) {
        result = await fn(cleanUrl, optionsObj);
        if (!result || !result.status) {
          result = await fn(cleanUrl, formatStr);
        }
      } else {
        result = await fn(cleanUrl);
      }

      if (result && result.status) {
        console.log(`[engine] ✅ ${platform.id}.${methodName} sukses!`);
        return result;
      }

      const failMsg = result?.message || "status false";
      console.warn(`[engine] ⚠️ ${platform.id}.${methodName} gagal: ${failMsg}`);
      errors.push(`${methodName}: ${failMsg}`);
    } catch (err) {
      console.error(`[engine] ❌ ${platform.id}.${methodName} error:`, err.message);
      errors.push(`${methodName}: ${err.message}`);
    }
  }

  return {
    status: false,
    message: `Semua scraper ${platform.label} gagal (${errors.join("; ")}).`,
  };
}

// ── State Store ──

const store = new Map();
let counter = 0;

function saveState(data) {
  const id = (++counter).toString(36);
  store.set(id, data);
  setTimeout(() => store.delete(id), 600_000);
  return id;
}

function getState(id) {
  return store.get(id);
}

function deleteState(id) {
  store.delete(id);
}

// ── File ID Cache ──

const fileIdCache = new Map();

// ── Media Helpers ──

const MAX_TG_SIZE = 48 * 1024 * 1024;

function getDownloads(result) {
  if (!result) return [];
  if (Array.isArray(result.downloads) && result.downloads.length > 0) return result.downloads;
  if (Array.isArray(result.items) && result.items.length > 0) return result.items;
  if (Array.isArray(result.tracks) && result.tracks.length > 0) return result.tracks;
  if (typeof result.download === "string") return [{ url: result.download, type: result.type || "video" }];
  if (typeof result.url === "string") return [{ url: result.url, type: result.type || "video" }];
  return [];
}

function mediaType(download) {
  const t = (download.type || "").toLowerCase();
  if (t.includes("video") || t === "mp4") return "video";
  if (t.includes("audio") || t === "mp3") return "audio";
  return "photo";
}

async function downloadToTemp(url) {
  const tmpPath = path.join(
    os.tmpdir(),
    `tgdl_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`
  );

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 120_000,
    maxContentLength: 100 * 1024 * 1024,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
    },
  });

  const contentLength = parseInt(response.headers["content-length"] || "0");
  if (contentLength > MAX_TG_SIZE) {
    response.data.destroy();
    return null;
  }

  const writer = fs.createWriteStream(tmpPath);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  const stats = fs.statSync(tmpPath);
  if (stats.size > MAX_TG_SIZE) {
    fs.unlinkSync(tmpPath);
    return null;
  }

  return tmpPath;
}

async function sendMedia(ctx, download, title) {
  const type = mediaType(download);
  const caption = title || "";
  const url = download.url;

  // Check file_id cache
  const cached = fileIdCache.get(url);
  if (cached) {
    try {
      if (cached.type === "video")
        return await ctx.replyWithVideo(cached.fileId, {
          caption,
          supports_streaming: true,
        });
      if (cached.type === "audio")
        return await ctx.replyWithAudio(cached.fileId, { caption, title });
      return await ctx.replyWithPhoto(cached.fileId, { caption });
    } catch {
      fileIdCache.delete(url);
    }
  }

  // Try URL-first (Telegram downloads server-side — faster, no bandwidth cost)
  try {
    let msg;
    if (type === "video") {
      msg = await ctx.replyWithVideo(url, { caption, supports_streaming: true });
      fileIdCache.set(url, { type: "video", fileId: msg.video.file_id });
    } else if (type === "audio") {
      msg = await ctx.replyWithAudio(url, { caption, title });
      fileIdCache.set(url, { type: "audio", fileId: msg.audio.file_id });
    } else {
      msg = await ctx.replyWithPhoto(url, { caption });
      fileIdCache.set(url, {
        type: "photo",
        fileId: msg.photo.slice(-1)[0].file_id,
      });
    }
    return msg;
  } catch {
    // URL-first failed (CDN blocks Telegram servers), fall back to local download
  }

  // Fallback: download locally, then upload
  const tmpPath = await downloadToTemp(url);
  if (!tmpPath) {
    // File too large for Telegram
    const { InlineKeyboard } = require("grammy");
    const kb = new InlineKeyboard().url("📥 Download Langsung", url);
    return ctx.reply(
      `📦 ${title}\n⚠️ File terlalu besar untuk Telegram (>48MB). Klik tombol di bawah.`,
      { reply_markup: kb }
    );
  }

  try {
    let msg;
    if (type === "video") {
      msg = await ctx.replyWithVideo(new InputFile(tmpPath), {
        caption,
        supports_streaming: true,
      });
      fileIdCache.set(url, { type: "video", fileId: msg.video.file_id });
    } else if (type === "audio") {
      msg = await ctx.replyWithAudio(new InputFile(tmpPath), {
        caption,
        title,
      });
      fileIdCache.set(url, { type: "audio", fileId: msg.audio.file_id });
    } else {
      msg = await ctx.replyWithPhoto(new InputFile(tmpPath), { caption });
      fileIdCache.set(url, {
        type: "photo",
        fileId: msg.photo.slice(-1)[0].file_id,
      });
    }
    return msg;
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

function escapeHtml(text) {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  PLATFORMS,
  detectPlatform,
  normalizeUrl,
  scrapeMedia,
  sendMedia,
  getDownloads,
  saveState,
  getState,
  deleteState,
  mediaType,
  escapeHtml,
};
