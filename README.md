# Telegram Universal Downloader Bot

Bot Telegram pengunduh video dan audio langsung ke chat menggunakan `scrapr` dan `grammY`.

## Fitur Utama

- **Kirim Video Langsung**: Mengirim file video (MP4) atau audio (MP3) ke chat Telegram, bukan sekadar link.
- **30 Platform**: YouTube, TikTok, Instagram, Twitter/X, Spotify, Facebook, SoundCloud, Reddit, Pinterest, Threads, Apple Music, Bilibili, Douyin, Pixiv, RedNote, Bandcamp, TeraBox, CapCut, Twitch Clips, SnackVideo, Vimeo, Bluesky, Streamable, Snapchat, Sfile.mobi, Deezer, Audiomack, Likee, Loom, Tidal.
- **Pemilihan Format**: YouTube mendukung format Video (720p) dan Audio (MP3) via inline button.
- **File ID Cache**: Re-send instan untuk URL yang pernah diunduh.
- **Fallback Otomatis**: Jika ukuran file melebihi batas Telegram (50MB), bot menyediakan tombol download langsung.

## Cara Menjalankan

1. Salin template environment:
   ```bash
   cp .env.example .env
   ```
2. Isi `BOT_TOKEN` di `.env` dengan token bot dari [@BotFather](https://t.me/BotFather).
3. Jalankan bot:
   ```bash
   npm start
   ```

## Menjalankan Self-Check

```bash
npm test
```
