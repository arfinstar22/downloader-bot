require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
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

// ── Commands ──

bot.command("start", async (ctx) => {
  const text =
    `👋 *Halo, ${engine.escapeHtml(ctx.from?.first_name || "Sobat")}!*\n\n` +
    `Saya adalah bot pengunduh media serbaguna (Universal Media Downloader).\n\n` +
    `⚡ *Cara Pakai:*\n` +
    `Cukup kirimkan link video/audio langsung ke chat ini. Saya akan mengunduh dan mengirimkan filenya langsung ke kamu!\n\n` +
    `📌 *Fitur:*\n` +
    `• Langsung kirim file video/audio (bukan cuma link)\n` +
    `• Dukungan 17 platform media sosial\n` +
    `• Pilihan kualitas video & audio (MP4 / MP3)\n` +
    `• Instant re-send via File ID Cache\n\n` +
    `Ketik /platforms untuk melihat daftar platform yang didukung.`;

  await ctx.reply(text, { parse_mode: "Markdown" });
});

bot.command("help", async (ctx) => {
  const text =
    `📖 *Panduan Penggunaan:*\n\n` +
    `1. Salin link dari YouTube, TikTok, Instagram, Twitter/X, Spotify, Facebook, dll.\n` +
    `2. Kirim link tersebut ke bot ini.\n` +
    `3. Untuk YouTube, pilih format (Video atau MP3) melalui tombol yang muncul.\n` +
    `4. Bot akan langsung mengirimkan file media ke chat.\n\n` +
    `⚠️ *Catatan Batasan File:*\n` +
    `Telegram membatasi upload bot maksimal ~50MB. Jika video berukuran lebih besar, bot akan menyediakan tombol download langsung.`;

  await ctx.reply(text, { parse_mode: "Markdown" });
});

bot.command("platforms", async (ctx) => {
  const list = engine.PLATFORMS.map((p) => `• ${p.label}`).join("\n");
  const text = `🌐 *Platform yang Didukung (17 Platform):*\n\n${list}\n\nKirimkan link dari platform mana pun di atas!`;
  await ctx.reply(text, { parse_mode: "Markdown" });
});

bot.command("ping", async (ctx) => {
  const start = Date.now();
  const msg = await ctx.reply("🏓 Pong!");
  const ms = Date.now() - start;
  await ctx.api.editMessageText(
    ctx.chat.id,
    msg.message_id,
    `🏓 Pong! Latency: *${ms}ms*`,
    { parse_mode: "Markdown" }
  );
});

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

  // Khusus YouTube: Tampilkan pilihan format MP4 / MP3
  if (platform.hasFormat) {
    const stateId = engine.saveState({
      url: rawUrl,
      platformId: platform.id,
      chatId: ctx.chat.id,
    });

    const kb = new InlineKeyboard()
      .text("📹 Video (720p)", `fmt:${stateId}:mp4`)
      .text("🎵 Audio (MP3)", `fmt:${stateId}:mp3`);

    await ctx.reply(
      `🎯 *${platform.label} Terdeteksi!*\n\nLink: \`${rawUrl}\`\nPilih format yang ingin diunduh:`,
      { reply_markup: kb, parse_mode: "Markdown" }
    );
    return;
  }

  // Platform langsung (TikTok, IG, Twitter, Spotify, dll)
  const statusMsg = await ctx.reply(
    `⏳ Sedang mengambil media dari *${platform.label}*...`,
    { parse_mode: "Markdown" }
  );

  try {
    const res = await engine.scrapeMedia(platform, rawUrl);
    if (!res || !res.status || !res.result) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `❌ Gagal mengambil media dari ${platform.label}.\nAlasan: ${
          res?.message || "Server tidak merespons atau link privat."
        }`
      );
      return;
    }

    const title = res.result.title || platform.label;
    const downloads = engine.getDownloads(res.result);

    if (downloads.length === 0) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `❌ Tidak ditemukan media yang dapat diunduh untuk link ini.`
      );
      return;
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `⬇️ Mengunduh dan mengirim media: *${engine.escapeHtml(title)}*...`,
      { parse_mode: "Markdown" }
    );

    // Ambil media pertama yang valid
    const targetDownload = downloads[0];
    await engine.sendMedia(ctx, targetDownload, title);

    // Hapus status pesan setelah terkirim
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch {}
  } catch (err) {
    console.error("Download error:", err);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `⚠️ Terjadi kesalahan saat memproses media: ${err.message}`
    );
  }
});

// ── Callback Query (Format Selection) ──

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("fmt:")) {
    const [, stateId, format] = data.split(":");
    const state = engine.getState(stateId);

    if (!state) {
      await ctx.answerCallbackQuery({
        text: "Sesi pemilihan format sudah kedaluwarsa. Kirim link ulang.",
        show_alert: true,
      });
      return;
    }

    const platform = engine.PLATFORMS.find((p) => p.id === state.platformId);
    if (!platform) {
      await ctx.answerCallbackQuery({ text: "Platform tidak dikenal." });
      return;
    }

    await ctx.answerCallbackQuery({ text: `Memproses format ${format.toUpperCase()}...` });

    try {
      await ctx.editMessageText(
        `⏳ Mengambil YouTube (${format.toUpperCase()})...\nMohon tunggu beberapa detik.`
      );
    } catch {}

    try {
      const res = await engine.scrapeMedia(platform, state.url, { format });
      if (!res || !res.status || !res.result) {
        const videoMatch = state.url.match(/(?:v=|youtu\.be\/)([^&?\s]{11})/i);
        const videoId = videoMatch ? videoMatch[1] : "";
        const fallbackKb = new InlineKeyboard()
          .url("🌐 Download via Y2Mate", `https://www.y2mate.com/youtube/${videoId}`)
          .row()
          .url("⚡ Download via Cobalt", `https://cobalt.tools`);

        await ctx.editMessageText(
          `⚠️ *Server Cloud Diblokir oleh Converter YouTube*\n\n` +
          `Server cloud Render (AWS) terdeteksi dan diblokir oleh anti-bot pihak ketiga converter YouTube.\n\n` +
          `👉 *Gunakan tombol di bawah untuk langsung download video ini di browser:*\n\n` +
          `💡 *Info:* 16 platform lain (*TikTok, Instagram Reels, Twitter/X, Spotify*, dll) tidak diblokir dan langsung mengirimkan file video/audio ke chat. Silakan dicoba!`,
          { reply_markup: fallbackKb, parse_mode: "Markdown" }
        );
        engine.deleteState(stateId);
        return;
      }

      const downloads = engine.getDownloads(res.result);
      if (downloads.length === 0) {
        await ctx.editMessageText("❌ Link unduhan tidak ditemukan.");
        engine.deleteState(stateId);
        return;
      }

      const title = res.result.title || "YouTube Media";
      await ctx.editMessageText(`⬇️ Mengirim ${format.toUpperCase()}: *${engine.escapeHtml(title)}*...`, {
        parse_mode: "Markdown",
      });

      const target = downloads[0];
      await engine.sendMedia(ctx, target, title);

      // Clean up message
      try {
        await ctx.deleteMessage();
      } catch {}
      engine.deleteState(stateId);
    } catch (err) {
      console.error("YouTube process error:", err);
      try {
        await ctx.editMessageText(`⚠️ Gagal mengirim media: ${err.message}`);
      } catch {}
      engine.deleteState(stateId);
    }
  }
});

// ── Global Error Handler ──

bot.catch((err) => {
  console.error("Telegram Bot Unhandled Error:", err);
});

// ── HTTP Health Check (Render / PaaS Keepalive) ──

const http = require("http");
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
}).listen(PORT, () => {
  console.log(`🌐 Health check server aktif di port ${PORT}`);
});

// ── Start Bot ──

console.log("Menghubungkan bot ke Telegram...");
bot.start({
  onStart: (info) => {
    console.log(`✅ Bot @${info.username} berhasil berjalan!`);
  }
});

