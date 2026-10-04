const scrapr = require("../scrapr");
const axios = require("axios");
const { InputFile } = require("grammy");
const { execFile } = require("child_process");
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
  {
    id: "capcut",
    label: "✂️ CapCut",
    pattern: /(?:capcut\.com|capcutshare\.com)/i,
    module: scrapr.capcut,
    methods: ["direct"],
  },
  {
    id: "twitch",
    label: "🎮 Twitch Clips",
    pattern: /(?:clips\.twitch\.tv\/|twitch\.tv\/[A-Za-z0-9_]+\/clip\/)/i,
    module: scrapr.twitch,
    methods: ["direct"],
  },
  {
    id: "snackvideo",
    label: "🍿 SnackVideo / Kwai",
    pattern: /(?:snackvideo\.com|sck\.io|kwai\.com|kwai-video\.com)/i,
    module: scrapr.snackvideo,
    methods: ["direct"],
  },
  {
    id: "vimeo",
    label: "🎬 Vimeo",
    pattern: /vimeo\.com\//i,
    module: scrapr.vimeo,
    methods: ["direct"],
  },
  {
    id: "bluesky",
    label: "🦋 Bluesky",
    pattern: /bsky\.app\//i,
    module: scrapr.bluesky,
    methods: ["direct"],
  },
  {
    id: "streamable",
    label: "📹 Streamable",
    pattern: /streamable\.com\//i,
    module: scrapr.streamable,
    methods: ["direct"],
  },
  {
    id: "snapchat",
    label: "👻 Snapchat Spotlight",
    pattern: /snapchat\.com\//i,
    module: scrapr.snapchat,
    methods: ["direct"],
  },
  {
    id: "sfile",
    label: "📁 Sfile.mobi",
    pattern: /sfile\.mobi\//i,
    module: scrapr.sfile,
    methods: ["direct"],
  },
  {
    id: "deezer",
    label: "🎵 Deezer",
    pattern: /(?:deezer\.com|deezer\.page\.link)/i,
    module: scrapr.deezer,
    methods: ["direct"],
  },
  {
    id: "audiomack",
    label: "🎶 Audiomack",
    pattern: /audiomack\.com\//i,
    module: scrapr.audiomack,
    methods: ["direct"],
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

// ── Direct YouTube Native Downloader (yt-dlp) ──

function downloadYouTubeVideo(url) {
  return new Promise((resolve, reject) => {
    const binPath = path.join(__dirname, "../bin/yt-dlp");
    const outTemplate = path.join(
      os.tmpdir(),
      `yt_${Date.now()}_${Math.random().toString(36).slice(2)}.%(ext)s`
    );
    const cleanUrl = normalizeUrl(url);

    const cookiePaths = [
      process.env.YOUTUBE_COOKIES_PATH,
      "/etc/secrets/cookies.txt",
      path.join(__dirname, "../cookies.txt"),
    ].filter(Boolean);
    const foundCookie = cookiePaths.find((p) => fs.existsSync(p));
    let cookieFile = null;

    if (foundCookie) {
      const writableCookie = path.join(os.tmpdir(), `yt_cookie_${Date.now()}.txt`);
      try {
        fs.copyFileSync(foundCookie, writableCookie);
        cookieFile = writableCookie;
        console.log(`[engine] Menggunakan YouTube cookies dari: ${foundCookie} (disalin ke writable temp)`);
      } catch {
        cookieFile = foundCookie;
      }
    } else if (process.env.YOUTUBE_COOKIES_CONTENT) {
      const tmpCookie = path.join(os.tmpdir(), `yt_cookie_${Date.now()}.txt`);
      try {
        fs.writeFileSync(tmpCookie, process.env.YOUTUBE_COOKIES_CONTENT, "utf-8");
        cookieFile = tmpCookie;
        console.log(`[engine] Menggunakan YouTube cookies dari YOUTUBE_COOKIES_CONTENT`);
      } catch {}
    } else {
      console.warn(`[engine] ⚠️ Tidak ada cookies YouTube yang ditemukan.`);
    }

    const args = [
      ...(cookieFile ? ["--cookies", cookieFile] : []),
      "--js-runtimes", "node",
      "--extractor-args", "youtube:player_client=visionos,web",
      "-f", "18/b/bv*[filesize<42M][ext=mp4]+ba[ext=m4a]/best",
      "--no-playlist",
      "--print", "after_move:filepath",
      "--print", "title",
      "-o", outTemplate,
      cleanUrl
    ];

    execFile(binPath, args, { timeout: 120000 }, (err, stdout, stderr) => {
      if (cookieFile && cookieFile.startsWith(os.tmpdir())) {
        try { fs.unlinkSync(cookieFile); } catch {}
      }
      if (err) {
        return reject(new Error(stderr || err.message));
      }
      const lines = stdout.trim().split("\n");
      const title = lines[0] || "YouTube Video";
      const downloadedPath = lines.find((l) => fs.existsSync(l));

      if (!downloadedPath || !fs.existsSync(downloadedPath)) {
        return reject(new Error("File video tidak ditemukan setelah download."));
      }

      const stat = fs.statSync(downloadedPath);
      if (stat.size > 49 * 1024 * 1024) {
        try { fs.unlinkSync(downloadedPath); } catch {}
        return reject(new Error("Ukuran video melebihi batas 50MB Telegram."));
      }

      resolve({ title, filePath: downloadedPath, size: stat.size });
    });
  });
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

async function downloadToTemp(url, ext = ".tmp") {
  const tmpPath = path.join(
    os.tmpdir(),
    `tgdl_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
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
  const caption = (title || "").slice(0, 1000);
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
  const ext = type === "video" ? ".mp4" : type === "audio" ? ".mp3" : ".jpg";
  const tmpPath = await downloadToTemp(url, ext);
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
      msg = await ctx.replyWithVideo(new InputFile(tmpPath, "video.mp4"), {
        caption,
        supports_streaming: true,
      });
      fileIdCache.set(url, { type: "video", fileId: msg.video.file_id });
    } else if (type === "audio") {
      msg = await ctx.replyWithAudio(new InputFile(tmpPath, "audio.mp3"), {
        caption,
        title,
      });
      fileIdCache.set(url, { type: "audio", fileId: msg.audio.file_id });
    } else {
      msg = await ctx.replyWithPhoto(new InputFile(tmpPath, "photo.jpg"), { caption });
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
  downloadYouTubeVideo,
  sendMedia,
  getDownloads,
  saveState,
  getState,
  deleteState,
  mediaType,
  escapeHtml,
};
