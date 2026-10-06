const axios = require("axios");
const https = require("https");

const rumbleAgent = new https.Agent({
  lookup: (hostname, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    // Bypass ISP DNS block (Indihome/Telkom) by routing directly to Cloudflare IP
    if (hostname.includes("rumble.com")) {
      if (options.all) return callback(null, [{ address: "172.66.2.15", family: 4 }]);
      return callback(null, "172.66.2.15", 4);
    }
    require("dns").lookup(hostname, options, callback);
  },
  rejectUnauthorized: false,
});

/**
 * Scrapes Rumble video metadata and stream links
 * @param {string} url - Rumble video URL (e.g. https://rumble.com/v1b538p-video-title.html)
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Rumble tidak boleh kosong.");

    // Extract video ID: e.g. /v1b538p- or /v1b538p.html or /embed/1b538p
    const match =
      cleanUrl.match(/rumble\.com\/v([a-zA-Z0-9]+)/i) ||
      cleanUrl.match(/rumble\.com\/embed\/([a-zA-Z0-9]+)/i);

    if (!match) {
      throw new Error("ID video Rumble tidak ditemukan dari URL.");
    }

    const videoId = match[1];

    const apiUrl = `https://rumble.com/embedJS/u3/?request=video&ver=2&v=${videoId}`;
    const res = await axios.get(apiUrl, {
      httpsAgent: rumbleAgent,
      headers: {
        "User-Agent": "curl/7.88.1",
        Accept: "*/*",
      },
      timeout: 12000,
    });

    const data = res.data;
    if (!data || typeof data !== "object") {
      throw new Error("Gagal mengambil data video Rumble.");
    }

    const rawTitle = data.title || `Rumble Video (${videoId})`;
    // Unescape HTML entities in title
    const title = rawTitle
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const thumbnail = data.i || null;
    const downloads = [];

    // Check for direct MP4 stream in data.u
    if (data.u) {
      if (data.u.mp4) {
        if (typeof data.u.mp4.url === "string") {
          downloads.push({
            type: "video",
            format: "mp4",
            quality: `${data.h || "720"}p`,
            url: data.u.mp4.url,
          });
        } else if (typeof data.u.mp4 === "object") {
          for (const [qualityKey, qObj] of Object.entries(data.u.mp4)) {
            if (qObj && qObj.url) {
              downloads.push({
                type: "video",
                format: "mp4",
                quality: `${qualityKey}p`,
                url: qObj.url,
              });
            }
          }
        }
      }

      // Check timeline or fallback MP4 stream
      if (downloads.length === 0 && data.u.timeline) {
        downloads.push({
          type: "video",
          format: "mp4",
          quality: "Default",
          url: data.u.timeline,
        });
      }

      // Check HLS if available
      if (downloads.length === 0 && data.u.hls?.url) {
        downloads.push({
          type: "video",
          format: "mp4",
          quality: "HLS Stream",
          url: data.u.hls.url,
        });
      }
    }

    if (downloads.length === 0) {
      throw new Error("Stream video Rumble tidak ditemukan atau video bersifat privat.");
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
      message: error.message || "Gagal mengunduh video Rumble.",
    };
  }
}

module.exports = { direct: scrape, scrape };
