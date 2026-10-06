const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes Google Drive public file direct download link and metadata
 * @param {string} url - Google Drive file URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Google Drive tidak boleh kosong.");

    const idMatch =
      cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
      cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/i) ||
      cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/i);

    if (!idMatch) {
      throw new Error("ID file Google Drive tidak ditemukan dari URL.");
    }

    const fileId = idMatch[1];
    const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

    let title = `Google Drive File (${fileId})`;
    let thumbnail = null;

    try {
      const pageRes = await axios.get(`https://drive.google.com/file/d/${fileId}/view`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        timeout: 8000,
      });

      const $ = cheerio.load(pageRes.data);
      const rawTitle =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().replace(" - Google Drive", "").trim();

      if (rawTitle) title = rawTitle;
      thumbnail = $('meta[property="og:image"]').attr("content") || null;
    } catch (_) {}

    const extMatch = title.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "bin";

    let type = "file";
    if (["mp4", "mkv", "webm", "avi", "mov"].includes(ext)) {
      type = "video";
    } else if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
      type = "audio";
    } else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      type = "image";
    }

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type,
        downloads: [
          {
            type,
            format: ext,
            quality: "Original",
            url: directUrl,
          },
        ],
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Gagal mengunduh file Google Drive.",
    };
  }
}

module.exports = { direct: scrape, scrape };
