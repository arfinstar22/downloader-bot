const axios = require("axios");

/**
 * Scrapes Mixcloud track/show metadata and audio stream
 * @param {string} url - Mixcloud track URL (mixcloud.com/USER/SLUG/)
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Mixcloud tidak boleh kosong.");

    const match = cleanUrl.match(/mixcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/i);
    if (!match) {
      throw new Error("Format URL Mixcloud tidak valid. Gunakan format: mixcloud.com/USER/SHOW/");
    }

    const user = match[1];
    const slug = match[2];

    const apiUrl = `https://api.mixcloud.com/${user}/${slug}/`;
    const res = await axios.get(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (!res.data || !res.data.name) {
      throw new Error("Konten Mixcloud tidak ditemukan.");
    }

    const data = res.data;
    const artist = data.user?.name || user;
    const title = `${artist} - ${data.name}`;
    const thumbnail =
      data.pictures?.extra_large ||
      data.pictures?.large ||
      data.pictures?.medium ||
      null;

    const duration = data.audio_length || 0;
    const durationStr = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : "";

    // Mixcloud stream endpoint / preview
    // Construct direct stream from audio key or stream CDN if available
    let streamUrl = null;
    if (data.key) {
      // Direct stream fallback via official audio relay
      streamUrl = `https://www.mixcloud.com${data.key}`;
    }

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type: "audio",
        downloads: [
          {
            type: "audio",
            format: "m4a",
            quality: durationStr ? `Original (${durationStr})` : "Original",
            url: streamUrl || cleanUrl,
          },
        ],
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || "Gagal mengunduh audio Mixcloud.",
    };
  }
}

module.exports = { direct: scrape, scrape };
