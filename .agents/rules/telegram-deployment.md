# Telegram Bot Deployment Learnings (Render & Cloud Hosting)

## Masalah: 409 Conflict pada getUpdates
- **Gejala:** `GrammyError: Call to 'getUpdates' failed! (409: Conflict: terminated by other getUpdates request)`
- **Akar Masalah:**
  Render dan PaaS modern menggunakan *zero-downtime rolling deploys*. Kontainer baru dinyalakan dan menjalankan polling `getUpdates` sebelum kontainer lama sempat dimatikan. Telegram hanya mengizinkan 1 sesi polling per bot token.
- **Solusi Wajib (Best Practice):**
  1. Pasang handler `SIGTERM` dan `SIGINT` yang memanggil `await bot.stop()` agar kontainer lama segera melepas lock Telegram saat menerima sinyal shutdown.
  2. Bungkus `bot.start()` dalam retry loop (misal 20x dengan jeda 5 detik) saat mendeteksi error 409, agar kontainer baru menunggu kontainer lama selesai terminate alih-alih langsung crash (`exit 1`).
  3. Panggil `await bot.api.deleteWebhook({ drop_pending_updates: true })` sebelum polling untuk membersihkan webhook atau lock gantung.
