const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes LinkedIn video metadata and direct MP4 download link
 * @param {string} url - LinkedIn post URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL LinkedIn tidak boleh kosong.");

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const res = await axios.get(cleanUrl, { headers, timeout: 15000, maxRedirects: 5 });
    const html = res.data;
    const $ = cheerio.load(html);

    let videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:secure_url"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content");

    if (!videoUrl) {
      // Check video tag
      const videoEl = $("video");
      if (videoEl.length) {
        videoUrl = videoEl.attr("src") || videoEl.find("source").attr("src");
        if (!videoUrl) {
          const sourcesAttr = videoEl.attr("data-sources");
          if (sourcesAttr) {
            try {
              const parsed = JSON.parse(sourcesAttr);
              if (Array.isArray(parsed) && parsed.length > 0) {
                videoUrl = parsed[parsed.length - 1].src;
              }
            } catch (_) {}
          }
        }
      }
    }

    if (!videoUrl) {
      // Regex match dms.licdn.com or mp4 stream
      const match = html.match(/https?:\/\/[a-z0-9.-]+\.licdn\.com\/dms\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (match) videoUrl = match[0].replace(/&amp;/g, "&");
    }

    if (!videoUrl) {
      throw new Error("Video LinkedIn tidak ditemukan. Pastikan postingan publik dan mengandung video.");
    }

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text().replace(/\| LinkedIn.*/i, "").trim() ||
      "LinkedIn Video";

    const thumbnail =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type: "video",
        downloads: [
          {
            type: "video",
            format: "mp4",
            quality: "HD",
            url: videoUrl,
          },
        ],
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Gagal mengunduh video LinkedIn.",
    };
  }
}

module.exports = { direct: scrape, scrape };
