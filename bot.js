require("dotenv").config();
const { Bot, InlineKeyboard, Keyboard, InputFile } = require("grammy");
const fs = require("fs");
const engine = require("./lib/engine");

const token = process.env.BOT_TOKEN;

if (!token || token.includes("your_telegram_bot_token_here")) {
  console.error("====================================================");
  console.error("⚠️  BOT_TOKEN belum diatur!");
  console.error("1. Buat file .env: cp .env.example .env");
  console.error("2. Dapatkan token dari @BotFather di Telegram");
  console.error("3. Masukkan token ke file .env: BOT_TOKEN=xxxx:yyyy");
  console.error("4. Jalankan bot: npm start");
  console.error("====================================================");
  process.exit(1);
}

const bot = new Bot(token);

const WEBAPP_URL =
  process.env.WEBAPP_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "https://downloader-bot-elsw.onrender.com";

// ── Persistent Bottom Keyboard (Menyertakan chatId pengguna) ──

function getBottomKeyboard(chatId) {
  const url = chatId ? `${WEBAPP_URL}?v=2&chatId=${chatId}` : `${WEBAPP_URL}?v=2`;
  return new Keyboard()
    .webApp("📱 Buka Downloader Mini App", url)
    .row()
    .text("🌐 Platform")
    .text("📖 Bantuan")
    .text("🏓 Ping")
    .resized()
    .persistent();
}

const bottomKeyboard = getBottomKeyboard();

// ── Commands & Button Handlers ──

bot.command("start", async (ctx) => {
  try {
    await ctx.setChatMenuButton({ type: "default" });
  } catch (_) {}

  const name = engine.escapeHtml(ctx.from?.first_name || "Sobat");

  // Pesan 1 — sambutan personal
  await ctx.reply(
    `👋 Halo, *${name}!*\n\nSelamat datang di *Darfin Downloader* — bot pengunduh media serba bisa yang bisa langsung mengirim file ke chat kamu. 🎉`,
    { parse_mode: "Markdown" }
  );

  // Pesan 2 — fitur unggulan
  await ctx.reply(
    `⚡ *Apa yang bisa aku lakukan?*\n\n` +
    `🎬  Unduh video & audio dari *${engine.PLATFORMS.length} platform* sekaligus:\n` +
    `    YouTube · TikTok · Instagram · Facebook · Twitter/X\n` +
    `    Spotify · Google Drive · Pinterest · CapCut · Snapchat\n` +
    `    LinkedIn · Reddit · Threads · MediaFire · Apple Music\n` +
    `    Twitch Clips · SoundCloud · Vimeo · Lemon8 · SnackVideo\n` +
    `    Likee · Dailymotion · Tumblr · TeraBox · Sfile.mobi\n` +
    `    Deezer · Tidal · Bluesky · Audiomack · Loom & lainnya\n\n` +
    `📤  File dikirim *langsung ke chat ini* — tidak perlu buka link eksternal\n` +
    `🚀  Re-send instan via cache jika link pernah diunduh sebelumnya\n` +
    `📦  Jika ukuran >48MB, bot otomatis kirim tombol *Download Langsung*`,
    { parse_mode: "Markdown" }
  );

  // Pesan 3 — cara pakai + CTA keyboard
  await ctx.reply(
    `🛠️ *Cara Pakai:*\n\n` +
    `1️⃣  Buka *📱 Mini App* lewat tombol di bawah — tampilan web interaktif\n` +
    `2️⃣  Atau langsung *tempel link* video/audio ke chat ini\n` +
    `3️⃣  Pilih format *Video (MP4)* atau *Audio (MP3)*\n` +
    `4️⃣  Bot akan langsung mengunduh & mengirim file ke kamu ✅\n\n` +
    `Yuk mulai unduhan pertamamu! 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: getBottomKeyboard(ctx.chat.id),
    }
  );
});

bot.command(["app", "miniapp"], async (ctx) => {
  await ctx.reply("Buka Downloader Mini App melalui tombol di bawah:", {
    reply_markup: getBottomKeyboard(ctx.chat.id),
  });
});

const sendHelp = async (ctx) => {
  const text =
    `📖 *Panduan Penggunaan:*\n\n` +
    `1. Klik tombol *📱 Buka Downloader Mini App* di keyboard bawah, atau tempel link langsung ke chat.\n` +
    `2. Didukung: YouTube, TikTok, Instagram, Twitter/X, Spotify, Facebook, dll.\n` +
    `3. Bot akan otomatis mengunduh dan mengirimkan file media langsung ke kamu.\n\n` +
    `⚠️ *Catatan Batasan File:*\n` +
    `Telegram membatasi upload bot maksimal ~50MB. Jika video berukuran lebih besar, bot akan menyediakan tombol download langsung.`;

  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: getBottomKeyboard(ctx.chat.id) });
};

const sendPlatforms = async (ctx) => {
  const list = engine.PLATFORMS.map((p) => `• ${p.label}`).join("\n");
  const text = `🌐 *Platform yang Didukung (${engine.PLATFORMS.length} Platform):*\n\n${list}\n\nKirimkan link dari platform mana pun di atas atau buka Mini App!`;
  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: getBottomKeyboard(ctx.chat.id) });
};

bot.command("help", sendHelp);
bot.hears("📖 Bantuan", sendHelp);

bot.command("platforms", sendPlatforms);
bot.hears("🌐 Platform", sendPlatforms);

const sendPing = async (ctx) => {
  const start = Date.now();
  const msg = await ctx.reply("🏓 Pong!", { reply_markup: getBottomKeyboard(ctx.chat.id) });
  const ms = Date.now() - start;
  await ctx.api.editMessageText(
    ctx.chat.id,
    msg.message_id,
    `🏓 Pong! Latency: *${ms}ms*`,
    { parse_mode: "Markdown" }
  );
};

bot.command("ping", sendPing);
bot.hears("🏓 Ping", sendPing);

// ── Unified Media Processor ──

async function processMediaDownload(ctx, rawUrl, options = {}) {
  const platform = engine.detectPlatform(rawUrl);
  if (!platform) {
    throw new Error("Platform link tidak didukung atau format salah.");
  }

  const isAudioPlatform = engine.isAudioPlatform(platform);
  const optObj = typeof options === "string" ? { format: options } : options;
  const requestedFormat = (optObj.format || (isAudioPlatform ? "mp3" : "mp4")).toLowerCase();
  const requestedQuality = (optObj.quality || (requestedFormat === "sd" ? "sd" : "hd")).toLowerCase();
  const isAudio = isAudioPlatform || requestedFormat === "mp3" || requestedFormat === "audio";

  // Khusus YouTube
  if (platform.id === "youtube") {
    const result = await engine.downloadYouTube(rawUrl, {
      format: isAudio ? "mp3" : "mp4",
      quality: requestedQuality,
    });
    const safeTitle = (result.title || "YouTube Media").slice(0, 100);
    try {
      if (isAudio) {
        const extra = {
          caption: `🎵 ${result.title}`.slice(0, 1000),
          title: result.title,
        };
        if (result.thumbnailPath && fs.existsSync(result.thumbnailPath)) {
          extra.thumbnail = new InputFile(result.thumbnailPath, "thumb.jpg");
        }
        await ctx.replyWithAudio(new InputFile(result.filePath, `${safeTitle}.mp3`), extra);

        if (optObj.sendCoverPhoto !== false && result.thumbnailPath && fs.existsSync(result.thumbnailPath)) {
          try {
            await ctx.replyWithPhoto(new InputFile(result.thumbnailPath, "thumb.jpg"), {
              caption: `🎨 Foto Album / Thumbnail: ${result.title}`.slice(0, 1000),
            });
          } catch (_) {}
        }
      } else {
        const extra = {
          caption: `▶️ ${result.title}`.slice(0, 1000),
          supports_streaming: true,
        };
        if (result.thumbnailPath && fs.existsSync(result.thumbnailPath)) {
          extra.thumbnail = new InputFile(result.thumbnailPath, "thumb.jpg");
        }
        await ctx.replyWithVideo(new InputFile(result.filePath, `${safeTitle}.mp4`), extra);
      }
    } finally {
      try { if (result.filePath && fs.existsSync(result.filePath)) fs.unlinkSync(result.filePath); } catch (_) {}
      try { if (result.thumbnailPath && fs.existsSync(result.thumbnailPath)) fs.unlinkSync(result.thumbnailPath); } catch (_) {}
    }
    return { title: result.title, platform: platform.label };
  }

  // Platform lain (TikTok, Instagram, Twitter, Spotify, dll)
  const res = await engine.scrapeMedia(platform, rawUrl, {
    format: isAudio ? "mp3" : "mp4",
    quality: requestedQuality,
  });
  if (!res || !res.status || !res.result) {
    throw new Error(res?.message || `Gagal mengambil media dari ${platform.label}.`);
  }

  const title = res.result.title || platform.label;
  const downloads = engine.getDownloads(res.result);
  if (downloads.length === 0) {
    throw new Error("Tidak ditemukan media yang dapat diunduh untuk link ini.");
  }

  const targetDownload = engine.selectDownload(downloads, {
    quality: requestedQuality,
    format: isAudio ? "mp3" : "mp4",
    isAudioOnly: isAudio,
  });

  if (!targetDownload) {
    throw new Error("Tidak ditemukan link unduhan yang sesuai.");
  }

  const fallbackSd =
    requestedQuality === "hd" && !isAudio
      ? engine.selectDownload(downloads, { quality: "sd", format: "mp4" })
      : null;

  const coverUrl = engine.getCoverPhoto(res.result);

  await engine.sendMedia(ctx, targetDownload, title, {
    quality: requestedQuality,
    coverUrl,
    sendCoverPhoto: isAudio && optObj.sendCoverPhoto !== false,
    performer: res.result.artist || undefined,
    album: res.result.album || undefined,
    duration: res.result.duration || undefined,
    fallbackSdDownload: fallbackSd && fallbackSd.url !== targetDownload.url ? fallbackSd : null,
  });

  return { title, platform: platform.label };
}

// ── URL Extraction & Platform Detection ──

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Extract URL
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) {
    if (!text.startsWith("/")) {
      await ctx.reply(
        "💡 Silakan kirimkan link video/audio yang ingin kamu unduh (misal: YouTube, TikTok, Instagram, Twitter, Spotify)."
      );
    }
    return;
  }

  const rawUrl = urlMatch[0];
  const platform = engine.detectPlatform(rawUrl);

  if (!platform) {
    await ctx.reply(
      "❌ Platform tidak didukung atau format link salah.\nKetik /platforms untuk melihat platform yang didukung."
    );
    return;
  }

  const isAudioPlatform = engine.isAudioPlatform(platform);

  // Periksa apakah pengguna mengetikkan akhiran kualitas di chat (misal: "https://... mp3" atau "https://... sd")
  const lowerText = text.toLowerCase();
  let explicitQuality = null;
  if (lowerText.includes(" mp3") || lowerText.includes(" audio") || lowerText.includes(" lagu")) {
    explicitQuality = "mp3";
  } else if (lowerText.includes(" sd") || lowerText.includes(" 360") || lowerText.includes(" 480")) {
    explicitQuality = "sd";
  } else if (lowerText.includes(" hd") || lowerText.includes(" 720") || lowerText.includes(" 1080")) {
    explicitQuality = "hd";
  }

  // Jika platform musik (Spotify, Apple Music, Deezer, SoundCloud, Tidal, dll):
  // Otomatis unduh audio musik + sertakan foto album!
  if (isAudioPlatform) {
    const statusMsg = await ctx.reply(
      `⏳ Sedang mengunduh lagu dari *${platform.label}*... Mohon tunggu sebentar.`,
      { parse_mode: "Markdown" }
    );
    try {
      await processMediaDownload(ctx, rawUrl, {
        format: "mp3",
        quality: "hd",
        sendCoverPhoto: true,
      });
      try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch {}
    } catch (err) {
      console.error(`Download error [${platform.id}]:`, err.message);
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `⚠️ Terjadi kesalahan saat mengunduh musik dari *${platform.label}*: ${err.message}`,
        { parse_mode: "Markdown" }
      );
    }
    return;
  }

  // Jika user menyertakan kualitas di teks:
  if (explicitQuality) {
    const statusMsg = await ctx.reply(
      `⏳ Sedang mengunduh *${platform.label}* (${explicitQuality.toUpperCase()})...`,
      { parse_mode: "Markdown" }
    );
    try {
      await processMediaDownload(ctx, rawUrl, {
        format: explicitQuality === "mp3" ? "mp3" : "mp4",
        quality: explicitQuality,
      });
      try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch {}
    } catch (err) {
      console.error(`Download error [${platform.id}]:`, err.message);
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `⚠️ Gagal mengunduh: ${err.message}`
      );
    }
    return;
  }

  // Untuk video: Tampilkan keyboard interaktif cerdas HD / SD / MP3
  const stateId = engine.saveState({ url: rawUrl, platformId: platform.id });
  const kb = new InlineKeyboard()
    .text("🎬 Video HD (1080p/720p)", `fmt:${stateId}:hd`)
    .row()
    .text("📱 Video SD (Hemat Kuota)", `fmt:${stateId}:sd`)
    .row()
    .text("🎵 Audio Saja (MP3)", `fmt:${stateId}:mp3`);

  await ctx.reply(
    `🎯 *${platform.label} Terdeteksi!*\n\n` +
    `Silakan pilih kualitas yang ingin kamu unduh:`,
    {
      reply_markup: kb,
      parse_mode: "Markdown",
    }
  );
});

// ── Callback Query (Quality & Format Selection) ──

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("fmt:")) {
    const [, stateId, formatOrQuality] = data.split(":");
    const state = engine.getState(stateId);

    if (!state) {
      await ctx.answerCallbackQuery({
        text: "Sesi pemilihan kualitas sudah kedaluwarsa. Silakan kirim link ulang.",
        show_alert: true,
      });
      return;
    }

    const platform = engine.PLATFORMS.find((p) => p.id === state.platformId);
    if (!platform) {
      await ctx.answerCallbackQuery({ text: "Platform tidak dikenal." });
      return;
    }

    const qualityLabel =
      formatOrQuality === "mp3"
        ? "Audio (MP3)"
        : formatOrQuality === "sd"
        ? "Video SD"
        : "Video HD";

    await ctx.answerCallbackQuery({ text: `Memproses ${qualityLabel}...` });

    try {
      await ctx.editMessageText(
        `⏳ Mengunduh *${platform.label}* (${qualityLabel})...\nMohon tunggu beberapa saat.`,
        { parse_mode: "Markdown" }
      );
    } catch {}

    try {
      await processMediaDownload(ctx, state.url, {
        format: formatOrQuality === "mp3" ? "mp3" : "mp4",
        quality: formatOrQuality,
        sendCoverPhoto: true,
      });

      // Bersihkan pesan status tombol setelah terkirim
      try { await ctx.deleteMessage(); } catch {}
      engine.deleteState(stateId);
    } catch (err) {
      console.error(`Callback download error [${platform.id}]:`, err.message);
      if (platform.id === "youtube") {
        const videoMatch = state.url.match(/(?:v=|youtu\.be\/)([^&?\s]{11})/i);
        const videoId = videoMatch ? videoMatch[1] : "";
        const fallbackKb = new InlineKeyboard()
          .url("🌐 Download via Y2Mate", `https://www.y2mate.com/youtube/${videoId}`)
          .row()
          .url("⚡ Download via Cobalt", `https://cobalt.tools`);

        try {
          await ctx.editMessageText(
            `⚠️ Gagal mengunduh langsung dari YouTube (${err.message}).\n\nKamu bisa mengunduh lewat tombol alternatif di bawah:`,
            { reply_markup: fallbackKb }
          );
        } catch {}
      } else {
        try {
          await ctx.editMessageText(`⚠️ Gagal mengunduh: ${err.message}`);
        } catch {}
      }
      engine.deleteState(stateId);
    }
  }
});

// ── Global Error Handler ──

bot.catch((err) => {
  console.error("Telegram Bot Unhandled Error:", err);
});

// ── Telegram Mini App Data Handler (tg.sendData fallback) ──

bot.on("message:web_app_data", async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    const rawUrl = data.url;
    const format = data.format || "hd";
    const quality = data.quality || (format === "sd" ? "sd" : "hd");
    if (!rawUrl) return;

    const statusMsg = await ctx.reply("⏳ Memproses unduhan dari Mini App...", {
      reply_markup: getBottomKeyboard(ctx.chat.id),
    });

    try {
      await processMediaDownload(ctx, rawUrl, {
        format: format === "mp3" ? "mp3" : "mp4",
        quality,
        sendCoverPhoto: true,
      });
      try { await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id); } catch {}
      try { await ctx.deleteMessage(); } catch {}
    } catch (err) {
      try { await ctx.deleteMessage(); } catch {}
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `⚠️ Gagal mengunduh: ${err.message}`
      );
    }
  } catch (err) {
    console.error("web_app_data error:", err);
  }
});


// ── HTTP Server (Mini App + API + Health Check) ──

const http = require("http");
const path = require("path");
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    } else {
      const isMedia = contentType.startsWith("image/");
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": isMedia ? "public, max-age=86400" : "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });
      res.end(content);
    }
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

http
  .createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // Health check
    if (pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    }

    // Mini App static assets
    if (req.method === "GET") {
      if (pathname === "/" || pathname === "/index.html") {
        return serveFile(res, path.join(PUBLIC_DIR, "index.html"), "text/html; charset=utf-8");
      }
      if (pathname === "/style.css") {
        return serveFile(res, path.join(PUBLIC_DIR, "style.css"), "text/css; charset=utf-8");
      }
      if (pathname === "/app.js") {
        return serveFile(res, path.join(PUBLIC_DIR, "app.js"), "application/javascript; charset=utf-8");
      }
      if (pathname === "/logo.jpg" || pathname === "/favicon.ico") {
        return serveFile(res, path.join(PUBLIC_DIR, "logo.jpg"), "image/jpeg");
      }
      if (pathname.startsWith("/icon/")) {
        const iconFile = path.basename(pathname);
        const iconPath = path.join(PUBLIC_DIR, "icon", iconFile);
        const ext = path.extname(iconFile).toLowerCase();
        const mimeTypes = {
          ".png": "image/png",
          ".webp": "image/webp",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".svg": "image/svg+xml",
        };
        return serveFile(res, iconPath, mimeTypes[ext] || "application/octet-stream");
      }
    }

    // API: Download & send media to user chat
    if (req.method === "POST" && pathname === "/api/download") {
      try {
        const body = await parseJsonBody(req);
        const { url: rawUrl, format = "hd", quality, userId, initData } = body;

        if (!rawUrl) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ success: false, message: "URL wajib diisi." }));
        }

        // Determine destination chat ID
        let chatId = userId || null;
        if (!chatId && initData) {
          try {
            const params = new URLSearchParams(initData);
            const userStr = params.get("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              if (u.id) chatId = u.id;
            }
          } catch {}
        }

        if (!chatId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              success: false,
              message: "Akun Telegram tidak terdeteksi. Silakan ketik /start di bot lalu buka kembali tombol Mini App.",
            })
          );
        }

        const fakeCtx = {
          chat: { id: chatId },
          api: bot.api,
          replyWithVideo: (f, o) => bot.api.sendVideo(chatId, f, o),
          replyWithAudio: (f, o) => bot.api.sendAudio(chatId, f, o),
          replyWithPhoto: (f, o) => bot.api.sendPhoto(chatId, f, o),
          reply: (t, o) => bot.api.sendMessage(chatId, t, o),
        };

        const effectiveQuality = quality || (format === "sd" ? "sd" : "hd");
        const effectiveFormat = format === "mp3" || format === "audio" ? "mp3" : "mp4";
        const result = await processMediaDownload(fakeCtx, rawUrl, {
          format: effectiveFormat,
          quality: effectiveQuality,
          sendCoverPhoto: true,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: true, title: result.title, platform: result.platform }));
      } catch (err) {
        console.error("API download error:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, message: err.message }));
      }
    }

    // 404 Fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  })
  .listen(PORT, () => {
    console.log(`🌐 Server aktif di port ${PORT} (Mini App & API ready)`);
  });

// ── Graceful Shutdown ──
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 Menerima sinyal ${signal}, menghentikan bot secara aman...`);
  try {
    await bot.stop();
  } catch (_) {}
  process.exit(0);
};

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ── Resilient Bot Polling with 409 Conflict Retry ──
async function runBot() {
  const maxRetries = 20;
  const retryDelay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (isShuttingDown) break;
    try {
      console.log(`Menghubungkan bot ke Telegram (percobaan ${attempt}/${maxRetries})...`);

      // Bersihkan webhook atau polling gantung sebelum mulai
      try {
        await bot.api.deleteWebhook({ drop_pending_updates: true });
      } catch (_) {}

      await bot.start({
        drop_pending_updates: true,
        onStart: async (info) => {
          console.log(`✅ Bot @${info.username} berhasil berjalan!`);
          try {
            await bot.api.setChatMenuButton({
              menu_button: {
                type: "default",
              },
            });
          } catch (_) {}
        },
      });
      break;
    } catch (err) {
      if (isShuttingDown) break;
      const isConflict =
        err.error_code === 409 ||
        (typeof err.message === "string" && err.message.includes("409"));

      if (isConflict) {
        console.warn(
          `⚠️ 409 Conflict: Instance bot lama masih berjalan di Render (rolling deploy). Menunggu ${retryDelay / 1000}s sebelum coba lagi... (${attempt}/${maxRetries})`
        );
        await new Promise((r) => setTimeout(r, retryDelay));
      } else {
        console.error("❌ Error polling bot:", err.message || err);
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
  }
}

runBot();

