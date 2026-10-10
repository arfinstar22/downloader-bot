const axios = require("axios");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Scrapes Loom video metadata and direct MP4 download link
 * @param {string} url - Loom share or embed URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Loom tidak boleh kosong.");

    const match = cleanUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
    if (!match) {
      throw new Error(
        "Format URL Loom tidak valid. Gunakan format: loom.com/share/ID"
      );
    }

    const id = match[1];

    // 1. Fetch direct transcoded MP4 URL via Loom's transcoding session API
    let videoUrl = null;
    try {
      const res = await axios.post(
        `https://www.loom.com/api/campaigns/sessions/${id}/transcoded-url`,
        {},
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            Referer: `https://www.loom.com/share/${id}`,
          },
          httpsAgent: agent,
          timeout: 15000,
        }
      );
      if (res.data && res.data.url) {
        videoUrl = res.data.url;
      }
    } catch (err) {
      // Fallback: check if direct S3 or cdn URL is discoverable
      const fallbackUrl = `https://cdn.loom.com/sessions/thumbnails/${id}-with-play.gif`;
    }

    // 2. Fetch oEmbed metadata for title & thumbnail
    let title = `Loom Video (${id})`;
    let thumbnail = `https://cdn.loom.com/sessions/thumbnails/${id}-with-play.gif`;
    try {
      const oembedRes = await axios.get(
        `https://www.loom.com/v1/oembed?url=https://www.loom.com/share/${id}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          httpsAgent: agent,
          timeout: 8000,
        }
      );
      if (oembedRes.data) {
        if (oembedRes.data.title) title = oembedRes.data.title;
        if (oembedRes.data.thumbnail_url) thumbnail = oembedRes.data.thumbnail_url;
      }
    } catch (_) {}

    if (!videoUrl) {
      throw new Error(
        "Gagal mendapatkan video Loom. Pastikan video publik dan dapat diakses siapa saja."
      );
    }

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
  } catch (err) {
    return {
      status: false,
      message:
        err.response?.data?.message || err.message || "Gagal mengunduh video Loom.",
    };
  }
}

module.exports = { direct: scrape, scrape };

