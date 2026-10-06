const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes MediaFire public file download link and metadata
 * @param {string} url - MediaFire file URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL MediaFire tidak boleh kosong.");

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const res = await axios.get(cleanUrl, { headers, timeout: 15000 });
    const $ = cheerio.load(res.data);

    let downloadUrl =
      $("a#downloadButton").attr("href") ||
      $("a.input.popsok").attr("href") ||
      $("a[aria-label*='Download']").attr("href") ||
      $("a.download_link").attr("href");

    if (!downloadUrl) {
      // Regex search for direct download URL in scripts if dynamic
      const match = res.data.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);
      if (match) downloadUrl = match[0];
    }

    if (!downloadUrl) {
      throw new Error("Gagal menemukan link download MediaFire. Pastikan file masih aktif.");
    }

    const title =
      $(".dl-btn-label").attr("title") ||
      $(".dl-btn-label").text().trim() ||
      $(".promoDownloadName").text().trim() ||
      $(".filename").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().replace("- MediaFire", "").trim() ||
      "MediaFire File";

    let size = "";
    $(".details li").each((_, el) => {
      const text = $(el).text();
      if (text.includes("File size:") || text.includes("Size:")) {
        size = text.replace(/.*(?:size:)/i, "").trim();
      }
    });

    const extMatch = title.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "bin";

    let type = "file";
    if (["mp4", "mkv", "webm", "avi", "mov"].includes(ext)) {
      type = "video";
    } else if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext)) {
      type = "audio";
    } else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      type = "image";
    }

    return {
      status: true,
      result: {
        title,
        thumbnail: null,
        type,
        downloads: [
          {
            type,
            format: ext,
            quality: size ? `Original (${size})` : "Original",
            url: downloadUrl,
            size: size || undefined,
          },
        ],
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Gagal mengunduh file MediaFire.",
    };
  }
}

module.exports = { direct: scrape, scrape };
