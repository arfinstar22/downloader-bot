const axios = require("axios");

/**
 * Scrapes Dailymotion video metadata and stream links
 * @param {string} url - Dailymotion video URL (dailymotion.com/video/ID or dai.ly/ID)
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Dailymotion tidak boleh kosong.");

    const idMatch =
      cleanUrl.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i) ||
      cleanUrl.match(/dai\.ly\/([a-zA-Z0-9]+)/i);

    if (!idMatch) {
      throw new Error("ID video Dailymotion tidak ditemukan dari URL.");
    }

    const videoId = idMatch[1];

    // 1. Fetch metadata from Dailymotion official API
    let title = `Dailymotion Video (${videoId})`;
    let thumbnail = null;
    let duration = 0;

    try {
      const apiRes = await axios.get(
        `https://api.dailymotion.com/video/${videoId}?fields=id,title,duration,thumbnail_720_url`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          timeout: 8000,
        }
      );
      if (apiRes.data) {
        if (apiRes.data.title) title = apiRes.data.title;
        if (apiRes.data.thumbnail_720_url) thumbnail = apiRes.data.thumbnail_720_url;
        if (apiRes.data.duration) duration = apiRes.data.duration;
      }
    } catch (_) {}

    // 2. Fetch player metadata for stream URLs
    let streamUrl = null;
    try {
      const metaRes = await axios.get(
        `https://www.dailymotion.com/player/metadata/video/${videoId}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Referer: "https://www.dailymotion.com/",
          },
          timeout: 8000,
        }
      );
      if (metaRes.data) {
        if (metaRes.data.title && title === `Dailymotion Video (${videoId})`) {
          title = metaRes.data.title;
        }
        if (!thumbnail && metaRes.data.posters) {
          thumbnail =
            metaRes.data.posters[1080] ||
            metaRes.data.posters[720] ||
            metaRes.data.posters[480] ||
            null;
        }
        const auto = metaRes.data.qualities?.auto;
        if (Array.isArray(auto) && auto.length > 0 && auto[0].url) {
          streamUrl = auto[0].url;
        }
      }
    } catch (_) {}

    const downloads = [];
    if (streamUrl) {
      downloads.push({
        type: "video",
        format: "mp4",
        quality: "HD Stream",
        url: streamUrl,
      });
    } else {
      // Fallback direct embed URL
      downloads.push({
        type: "video",
        format: "mp4",
        quality: "Default",
        url: `https://www.dailymotion.com/video/${videoId}`,
      });
    }

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type: "video",
        downloads,
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Gagal mengunduh video Dailymotion.",
    };
  }
}

module.exports = { direct: scrape, scrape };
