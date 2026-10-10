const scrapr = require("../scrapr");
const axios = require("axios");
const { InputFile, InlineKeyboard } = require("grammy");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Platform Config ──

const PLATFORMS = [
  {
    id: "youtube",
    label: "▶️ YouTube",
    category: "video",
    pattern: /youtube\.com\/(?:watch|shorts|embed|playlist)|youtu\.be\/|music\.youtube\.com\//i,
    module: scrapr.youtube,
    methods: ["ytmp3", "ytmp3gg"],
    hasFormat: true,
  },
  {
    id: "tiktok",
    label: "🎵 TikTok",
    category: "video",
    pattern: /tiktok\.com/i,
    module: scrapr.tiktok,
    methods: ["snaptik", "tiktokio", "ssstik", "savetik", "tikdownloader"],
  },
  {
    id: "instagram",
    label: "📸 Instagram",
    category: "video",
    pattern: /instagram\.com\//i,
    module: scrapr.instagram,
    methods: ["direct", "indown", "snapsave", "snapinsta"],
  },
  {
    id: "facebook",
    label: "📘 Facebook",
    category: "video",
    pattern: /facebook\.com\/|fb\.watch\//i,
    module: scrapr.facebook,
    methods: ["snapsave", "fdown"],
  },
  {
    id: "twitter",
    label: "🐦 Twitter/X",
    category: "video",
    pattern: /(?:^|https?:\/\/|\/\/)(?:[a-z0-9-]+\.)?(?:twitter|x)\.com\//i,
    module: scrapr.twitter,
    methods: ["direct", "tweeload", "tvd", "savetwt"],
  },
  {
    id: "spotify",
    label: "🎧 Spotify",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /open\.spotify\.com\//i,
    module: scrapr.spotify,
    methods: ["spotmate", "spotidown", "soundloaders", "spotisaver"],
  },
  {
    id: "googledrive",
    label: "📁 Google Drive",
    category: "file",
    pattern: /(?:drive\.google\.com|docs\.google\.com\/file)/i,
    module: scrapr.googledrive,
    methods: ["direct", "scrape"],
  },
  {
    id: "pinterest",
    label: "📌 Pinterest",
    category: "video",
    pattern: /pinterest\.com\//i,
    module: scrapr.pinterest,
    methods: ["direct", "pindown"],
  },
  {
    id: "capcut",
    label: "✂️ CapCut",
    category: "video",
    pattern: /(?:capcut\.com|capcutshare\.com)/i,
    module: scrapr.capcut,
    methods: ["direct", "scrape"],
  },
  {
    id: "snapchat",
    label: "👻 Snapchat Spotlight",
    category: "video",
    pattern: /snapchat\.com\//i,
    module: scrapr.snapchat,
    methods: ["direct", "scrape"],
  },
  {
    id: "linkedin",
    label: "💼 LinkedIn",
    category: "video",
    pattern: /linkedin\.com\/(?:posts|feed\/update|video)\//i,
    module: scrapr.linkedin,
    methods: ["direct", "scrape"],
  },
  {
    id: "reddit",
    label: "🤖 Reddit",
    category: "video",
    pattern: /reddit\.com\//i,
    module: scrapr.reddit,
    methods: ["rapidsave"],
  },
  {
    id: "threads",
    label: "🧵 Threads",
    category: "video",
    pattern: /threads\.net\//i,
    module: scrapr.threads,
    methods: ["threadster"],
  },
  {
    id: "mediafire",
    label: "🔥 MediaFire",
    category: "file",
    pattern: /mediafire\.com\//i,
    module: scrapr.mediafire,
    methods: ["direct", "scrape"],
  },
  {
    id: "applemusic",
    label: "🍎 Apple Music",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /music\.apple\.com\//i,
    module: scrapr.applemusic,
    methods: ["aplmate"],
  },
  {
    id: "twitch",
    label: "🎮 Twitch Clips",
    category: "video",
    pattern: /(?:clips\.twitch\.tv\/|twitch\.tv\/[A-Za-z0-9_]+\/clip\/)/i,
    module: scrapr.twitch,
    methods: ["direct", "scrape"],
  },
  {
    id: "soundcloud",
    label: "☁️ SoundCloud",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /soundcloud\.com\//i,
    module: scrapr.soundcloud,
    methods: ["klickaud"],
  },
  {
    id: "vimeo",
    label: "🎬 Vimeo",
    category: "video",
    pattern: /vimeo\.com\//i,
    module: scrapr.vimeo,
    methods: ["direct", "scrape"],
  },
  {
    id: "lemon8",
    label: "🍋 Lemon8",
    category: "video",
    pattern: /(?:lemon8-app\.com|v\.lemon8-app\.com)/i,
    module: scrapr.lemon8,
    methods: ["direct", "scrape"],
  },
  {
    id: "snackvideo",
    label: "🍿 SnackVideo / Kwai",
    category: "video",
    pattern: /(?:snackvideo\.com|sck\.io|kwai\.com|kwai-video\.com)/i,
    module: scrapr.snackvideo,
    methods: ["direct", "scrape"],
  },
  {
    id: "likee",
    label: "✨ Likee",
    category: "video",
    pattern: /(?:likee\.video|like-video\.com|l\.likee\.video)/i,
    module: scrapr.likee,
    methods: ["direct", "scrape"],
  },
  {
    id: "dailymotion",
    label: "🎥 Dailymotion",
    category: "video",
    pattern: /(?:dailymotion\.com\/(?:video|embed\/video)|dai\.ly\/)/i,
    module: scrapr.dailymotion,
    methods: ["direct", "scrape"],
  },
  {
    id: "tumblr",
    label: "🔮 Tumblr",
    category: "video",
    pattern: /(?:tumblr\.com|tmblr\.co)\//i,
    module: scrapr.tumblr,
    methods: ["direct", "scrape"],
  },
  {
    id: "terabox",
    label: "📦 TeraBox",
    category: "file",
    pattern: /terabox\.com\//i,
    module: scrapr.terabox,
    methods: ["sechno"],
  },
  {
    id: "sfile",
    label: "📁 Sfile.mobi",
    category: "file",
    pattern: /sfile\.mobi\//i,
    module: scrapr.sfile,
    methods: ["direct", "scrape"],
  },
  {
    id: "deezer",
    label: "🎵 Deezer",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /(?:deezer\.com|deezer\.page\.link)/i,
    module: scrapr.deezer,
    methods: ["direct", "scrape"],
  },
  {
    id: "tidal",
    label: "🌊 Tidal",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /(?:tidal\.com|listen\.tidal\.com)/i,
    module: scrapr.tidal,
    methods: ["direct", "scrape"],
  },
  {
    id: "bluesky",
    label: "🦋 Bluesky",
    category: "video",
    pattern: /bsky\.app\//i,
    module: scrapr.bluesky,
    methods: ["direct", "scrape"],
  },
  {
    id: "audiomack",
    label: "🎶 Audiomack",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /audiomack\.com\//i,
    module: scrapr.audiomack,
    methods: ["direct", "scrape"],
  },
  {
    id: "loom",
    label: "🎥 Loom",
    category: "video",
    pattern: /loom\.com\/(?:share|embed)\//i,
    module: scrapr.loom,
    methods: ["direct", "scrape"],
  },
  {
    id: "mixcloud",
    label: "🎧 Mixcloud",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /mixcloud\.com\//i,
    module: scrapr.mixcloud,
    methods: ["direct", "scrape"],
  },
  {
    id: "rumble",
    label: "🟢 Rumble",
    category: "video",
    pattern: /rumble\.com\/(?:v|embed\/)/i,
    module: scrapr.rumble,
    methods: ["direct", "scrape"],
  },
  {
    id: "bandcamp",
    label: "🎸 Bandcamp",
    category: "audio",
    defaultFormat: "mp3",
    pattern: /bandcamp\.com\//i,
    module: scrapr.bandcamp,
    methods: ["bandcampdownloader"],
  },
  {
    id: "pixeldrain",
    label: "💧 Pixeldrain",
    category: "file",
    pattern: /pixeldrain\.com\/(?:u|l|api\/file)\//i,
    module: scrapr.pixeldrain,
    methods: ["direct", "scrape"],
  },
  {
    id: "gofile",
    label: "📂 Gofile",
    category: "file",
    pattern: /gofile\.io\/d\//i,
    module: scrapr.gofile,
    methods: ["direct", "scrape"],
  },
  {
    id: "streamable",
    label: "📹 Streamable",
    category: "video",
    pattern: /streamable\.com\//i,
    module: scrapr.streamable,
    methods: ["direct", "scrape"],
  },
  {
    id: "bilibili",
    label: "📺 Bilibili",
    category: "video",
    pattern: /bilibili\.com\//i,
    module: scrapr.bilibili,
    methods: ["direct"],
  },
  {
    id: "douyin",
    label: "🎭 Douyin",
    category: "video",
    pattern: /douyin\.com/i,
    module: scrapr.douyin,
    methods: ["direct"],
  },
  {
    id: "pixiv",
    label: "🎨 Pixiv",
    category: "file",
    pattern: /pixiv\.net\//i,
    module: scrapr.pixiv,
    methods: ["ajax"],
  },
  {
    id: "rednote",
    label: "📕 RedNote",
    category: "video",
    pattern: /rednote\.com\/|xiaohongshu\.com\//i,
    module: scrapr.rednote,
    methods: ["direct"],
  },
];

function detectPlatform(url) {
  if (!url) return null;
  for (const p of PLATFORMS) {
    if (p.pattern.test(url)) return p;
  }
  return null;
}

function isAudioPlatform(platform) {
  if (!platform) return false;
  return platform.category === "audio" || platform.defaultFormat === "mp3";
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
  const audioMode = isAudioPlatform(platform);
  const defaultFmt = audioMode ? "mp3" : "mp4";

  const formatStr =
    typeof options === "string"
      ? options
      : options.format || defaultFmt;

  const optionsObj =
    typeof options === "object"
      ? { format: formatStr, ...options }
      : { format: formatStr };

  for (const methodName of platform.methods) {
    try {
      const fn =
        platform.module[methodName] ||
        platform.module.direct ||
        platform.module.scrape;

      if (!fn) continue;

      console.log(`[engine] Mencoba ${platform.id}.${methodName} untuk ${cleanUrl}...`);

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
        // Normalisasi struktur output result
        if (!result.result && (result.data || result.downloads || result.url)) {
          result.result = result.data || result;
        }
        if (result.result) {
          result.result.downloads = getDownloads(result.result);
          result.result.thumbnail = getCoverPhoto(result.result);
          if (audioMode) {
            result.result.type = "audio";
          }
        }
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

function downloadYouTube(url, options = {}) {
  return new Promise((resolve, reject) => {
    const binPath = path.join(__dirname, "../bin/yt-dlp");
    const isAudio = options.format === "mp3" || options.format === "audio";
    const quality = options.quality || "hd";
    const extTpl = isAudio ? "mp3" : "%(ext)s";
    const outTemplate = path.join(
      os.tmpdir(),
      `yt_${Date.now()}_${Math.random().toString(36).slice(2)}.${extTpl}`
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
        console.log(`[engine] Menggunakan YouTube cookies dari: ${foundCookie} (disalin ke temp)`);
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

    let formatSelector;
    if (isAudio) {
      formatSelector = "ba[filesize<45M]/ba/bestaudio";
    } else if (quality === "sd") {
      // SD format: max 480p, hemat kuota & pas di Telegram
      formatSelector = "18/b[height<=480][filesize<45M]/best[height<=480]/best[filesize<45M]";
    } else {
      // HD format: 720p/1080p dengan batas Telegram 45MB
      formatSelector =
        "bv*[height<=1080][filesize<45M][ext=mp4]+ba[ext=m4a]/b[height<=1080][filesize<45M]/bv*[filesize<45M]+ba/best[filesize<45M]/18/best";
    }

    const args = [
      ...(cookieFile ? ["--cookies", cookieFile] : []),
      "--js-runtimes", "node",
      "--extractor-args", "youtube:player_client=visionos,web",
      ...(isAudio
        ? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
        : []),
      "-f", formatSelector,
      "--no-playlist",
      "--write-thumbnail",
      "--print", "after_move:filepath",
      "--print", "title",
      "-o", outTemplate,
      cleanUrl,
    ];

    execFile(binPath, args, { timeout: 150000 }, (err, stdout, stderr) => {
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
        return reject(new Error("File media tidak ditemukan setelah proses download."));
      }

      const stat = fs.statSync(downloadedPath);
      if (stat.size > 49 * 1024 * 1024) {
        try { fs.unlinkSync(downloadedPath); } catch {}
        return reject(new Error("Ukuran media melebihi batas 50MB Telegram."));
      }

      // Cari thumbnail yang mungkin di-download oleh yt-dlp
      const basePrefix = downloadedPath.replace(/\.[^.]+$/, "");
      let thumbnailPath = null;
      for (const ext of [".jpg", ".webp", ".png", ".jpeg"]) {
        const candidate = basePrefix + ext;
        if (fs.existsSync(candidate)) {
          thumbnailPath = candidate;
          break;
        }
      }

      resolve({
        title,
        filePath: downloadedPath,
        size: stat.size,
        thumbnailPath,
        type: isAudio ? "audio" : "video",
      });
    });
  });
}

const downloadYouTubeVideo = downloadYouTube;

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

function getCoverPhoto(result) {
  if (!result) return null;
  if (result.thumbnail && typeof result.thumbnail === "string" && result.thumbnail.startsWith("http")) {
    return result.thumbnail;
  }
  if (result.cover && typeof result.cover === "string" && result.cover.startsWith("http")) {
    return result.cover;
  }
  if (result.image && typeof result.image === "string" && result.image.startsWith("http")) {
    return result.image;
  }
  const downloads = getDownloads(result);
  const coverItem = downloads.find((d) => {
    const t = (d.type || "").toLowerCase();
    const q = (d.quality || "").toLowerCase();
    return t === "photo" || t === "image" || q.includes("cover");
  });
  return coverItem ? coverItem.url : null;
}

function mediaType(download, platform) {
  if (!download) return "photo";
  if (platform && isAudioPlatform(platform)) return "audio";
  const t = (download.type || "").toLowerCase();
  const f = (download.format || "").toLowerCase();
  const u = (download.url || "").toLowerCase();
  const q = (download.quality || "").toLowerCase();

  if (t === "photo" || t === "image" || q.includes("cover")) return "photo";
  if (t.includes("video") || f.includes("mp4") || u.includes(".mp4")) return "video";
  if (t.includes("audio") || t.includes("mp3") || f.includes("mp3") || f.includes("m4a") || u.includes(".mp3") || u.includes(".m4a")) {
    return "audio";
  }
  return "video";
}

/**
 * Memilih stream download terbaik berdasarkan preferensi kualitas (HD, SD, Audio)
 */
function selectDownload(downloads, { quality = "hd", format = "mp4", isAudioOnly = false } = {}) {
  if (!downloads || downloads.length === 0) return null;

  // Jika platform audio murni atau diminta MP3:
  if (isAudioOnly || format === "mp3" || format === "audio") {
    // Cari stream audio, abaikan cover foto
    const audioItems = downloads.filter((d) => {
      const t = (d.type || "").toLowerCase();
      const f = (d.format || "").toLowerCase();
      const q = (d.quality || "").toLowerCase();
      const u = (d.url || "").toLowerCase();
      if (t === "photo" || t === "image" || q.includes("cover")) return false;
      return t.includes("audio") || t.includes("mp3") || f === "mp3" || f === "m4a" || u.includes(".mp3") || q.includes("kbps");
    });
    if (audioItems.length > 0) return audioItems[0];

    const nonImages = downloads.filter(
      (d) => (d.type || "").toLowerCase() !== "photo" && (d.type || "").toLowerCase() !== "image"
    );
    if (nonImages.length > 0) return nonImages[0];
    return downloads[0];
  }

  // Khusus Video: saring yang merupakan video (abaikan cover photo & audio jika ada video)
  const videoCandidates = downloads.filter((d) => {
    const t = (d.type || "").toLowerCase();
    const q = (d.quality || "").toLowerCase();
    return t !== "photo" && t !== "image" && !q.includes("cover");
  });

  const pool = videoCandidates.length > 0 ? videoCandidates : downloads;

  if (quality === "sd") {
    const sdItem = pool.find((d) => {
      const q = (d.quality || "").toLowerCase();
      return (
        q.includes("sd") ||
        q.includes("360") ||
        q.includes("480") ||
        q.includes("normal") ||
        q.includes("standard") ||
        q.includes("low")
      );
    });
    if (sdItem) return sdItem;
    // Ambil item terakhir jika tidak eksplisit bertanda SD
    return pool[pool.length - 1];
  }

  // Default: HD preference
  const hdItem = pool.find((d) => {
    const q = (d.quality || "").toLowerCase();
    return (
      q.includes("hd") ||
      q.includes("1080") ||
      q.includes("720") ||
      q.includes("2k") ||
      q.includes("4k") ||
      q.includes("high") ||
      q.includes("no watermark") ||
      q.includes("nowatermark")
    );
  });
  if (hdItem) return hdItem;

  return pool[0];
}

async function downloadToTemp(url, ext = ".tmp", maxBytes = MAX_TG_SIZE) {
  const tmpPath = path.join(
    os.tmpdir(),
    `tgdl_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
  );

  let response;
  try {
    response = await axios.get(url, {
      responseType: "stream",
      timeout: 120_000,
      maxContentLength: 100 * 1024 * 1024,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
      },
    });
  } catch (err) {
    console.error("[engine] downloadToTemp axios request failed:", err.message);
    return null;
  }

  const contentLength = parseInt(response.headers["content-length"] || "0");
  if (contentLength > maxBytes) {
    try { response.data.destroy(); } catch (_) {}
    return null;
  }

  const writer = fs.createWriteStream(tmpPath);
  let totalBytes = 0;
  let isAborted = false;

  await new Promise((resolve, reject) => {
    response.data.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes && !isAborted) {
        isAborted = true;
        try { response.data.destroy(); } catch (_) {}
        try { writer.destroy(); } catch (_) {}
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
        resolve();
      }
    });

    response.data.on("error", (err) => {
      try { writer.destroy(); } catch (_) {}
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      reject(err);
    });

    writer.on("error", (err) => {
      try { response.data.destroy(); } catch (_) {}
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      reject(err);
    });

    writer.on("finish", () => {
      resolve();
    });

    response.data.pipe(writer);
  });

  if (isAborted) {
    return null;
  }

  if (!fs.existsSync(tmpPath)) {
    return null;
  }

  const stats = fs.statSync(tmpPath);
  if (stats.size > maxBytes || stats.size === 0) {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    return null;
  }

  return tmpPath;
}

async function sendMedia(ctx, download, title, options = {}) {
  const type = options.forcedType || mediaType(download);
  const caption = (title || "").slice(0, 1000);
  const url = download.url;
  const coverUrl = options.coverUrl || null;
  const performer = options.performer || options.artist || undefined;
  const trackTitle = options.trackTitle || title || "Audio Track";
  const duration = options.duration || undefined;

  // 1. Cek file_id cache
  const cached = fileIdCache.get(url);
  if (cached) {
    try {
      if (cached.type === "video") {
        return await ctx.replyWithVideo(cached.fileId, {
          caption,
          supports_streaming: true,
        });
      }
      if (cached.type === "audio") {
        return await ctx.replyWithAudio(cached.fileId, {
          caption,
          title: trackTitle,
          performer,
          duration,
        });
      }
      return await ctx.replyWithPhoto(cached.fileId, { caption });
    } catch {
      fileIdCache.delete(url);
    }
  }

  // 2. Coba URL-first untuk audio atau video
  let urlSent = false;
  try {
    let msg;
    if (type === "video") {
      msg = await ctx.replyWithVideo(url, { caption, supports_streaming: true });
      fileIdCache.set(url, { type: "video", fileId: msg.video.file_id });
      urlSent = true;
      return msg;
    } else if (type === "audio") {
      msg = await ctx.replyWithAudio(url, {
        caption,
        title: trackTitle,
        performer,
        duration,
      });
      fileIdCache.set(url, { type: "audio", fileId: msg.audio.file_id });
      urlSent = true;

      // Jika ada cover album dan diminta kirim foto
      if (options.sendCoverPhoto && coverUrl) {
        try {
          await ctx.replyWithPhoto(coverUrl, {
            caption: `🎨 Foto Album: ${trackTitle}`.slice(0, 1000),
          });
        } catch (_) {}
      }
      return msg;
    } else {
      msg = await ctx.replyWithPhoto(url, { caption });
      fileIdCache.set(url, {
        type: "photo",
        fileId: msg.photo.slice(-1)[0].file_id,
      });
      urlSent = true;
      return msg;
    }
  } catch {
    // URL-first gagal (CDN proteksi atau Telegram timeout), lanjut ke local download
  }

  // 3. Fallback: Unduh ke lokal, lalu unggah
  const ext = type === "video" ? ".mp4" : type === "audio" ? ".mp3" : ".jpg";
  const tmpPath = await downloadToTemp(url, ext);

  if (!tmpPath) {
    // Jika file melebihi batas 48MB Telegram
    if (options.fallbackSdDownload && options.fallbackSdDownload.url !== url) {
      console.log(`[engine] HD melebihi batas, mencoba SD fallback...`);
      return sendMedia(ctx, options.fallbackSdDownload, `${title} (SD)`, {
        ...options,
        fallbackSdDownload: null,
      });
    }

    const kb = new InlineKeyboard().url("📥 Download Langsung", url);
    return ctx.reply(
      `📦 *${escapeHtml(title)}*\n⚠️ File terlalu besar untuk Telegram (>48MB). Silakan unduh langsung melalui tombol di bawah:`,
      { reply_markup: kb, parse_mode: "Markdown" }
    );
  }

  // Download cover photo untuk thumbnail audio/video jika ada
  let thumbTempPath = null;
  if (coverUrl && (type === "audio" || type === "video")) {
    try {
      thumbTempPath = await downloadToTemp(coverUrl, ".jpg", 5 * 1024 * 1024);
    } catch (_) {}
  }

  try {
    let msg;
    if (type === "video") {
      const extra = { caption, supports_streaming: true };
      if (thumbTempPath) {
        extra.thumbnail = new InputFile(thumbTempPath, "thumb.jpg");
      }
      msg = await ctx.replyWithVideo(new InputFile(tmpPath, "video.mp4"), extra);
      if (msg?.video?.file_id) {
        fileIdCache.set(url, { type: "video", fileId: msg.video.file_id });
      }
    } else if (type === "audio") {
      const extra = { caption, title: trackTitle, performer, duration };
      if (thumbTempPath) {
        extra.thumbnail = new InputFile(thumbTempPath, "cover.jpg");
      }
      msg = await ctx.replyWithAudio(new InputFile(tmpPath, `${trackTitle}.mp3`), extra);
      if (msg?.audio?.file_id) {
        fileIdCache.set(url, { type: "audio", fileId: msg.audio.file_id });
      }

      // Kirim foto album resolusi tinggi jika diminta
      if (options.sendCoverPhoto && coverUrl) {
        try {
          if (thumbTempPath) {
            await ctx.replyWithPhoto(new InputFile(thumbTempPath, "album_art.jpg"), {
              caption: `🎨 Foto Album: ${trackTitle}`.slice(0, 1000),
            });
          } else {
            await ctx.replyWithPhoto(coverUrl, {
              caption: `🎨 Foto Album: ${trackTitle}`.slice(0, 1000),
            });
          }
        } catch (_) {}
      }
    } else {
      msg = await ctx.replyWithPhoto(new InputFile(tmpPath, "photo.jpg"), { caption });
      if (msg?.photo?.length) {
        fileIdCache.set(url, {
          type: "photo",
          fileId: msg.photo.slice(-1)[0].file_id,
        });
      }
    }
    return msg;
  } finally {
    try { if (tmpPath) fs.unlinkSync(tmpPath); } catch (_) {}
    try { if (thumbTempPath) fs.unlinkSync(thumbTempPath); } catch (_) {}
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
  isAudioPlatform,
  normalizeUrl,
  scrapeMedia,
  downloadYouTube,
  downloadYouTubeVideo,
  sendMedia,
  getDownloads,
  getCoverPhoto,
  selectDownload,
  saveState,
  getState,
  deleteState,
  mediaType,
  escapeHtml,
  downloadToTemp,
};
