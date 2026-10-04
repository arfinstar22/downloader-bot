const axios = require("axios");

async function scrape(url) {
  try {
    let cleanUrl = url.trim();

    // Resolve shortlink if needed
    if (cleanUrl.includes("deezer.page.link") || !cleanUrl.includes("/track/")) {
      const headRes = await axios.get(cleanUrl, { maxRedirects: 5, timeout: 8000 });
      if (headRes.request?.res?.responseUrl) {
        cleanUrl = headRes.request.res.responseUrl;
      }
    }

    const trackIdMatch = cleanUrl.match(/\/track\/(\d+)/i);
    if (!trackIdMatch) {
      throw new Error("Track ID Deezer tidak ditemukan dalam tautan.");
    }
    const trackId = trackIdMatch[1];

    const res = await axios.get(`https://api.deezer.com/track/${trackId}`, {
      timeout: 10000,
    });

    const data = res.data;
    if (data.error) {
      throw new Error(data.error.message || "Track Deezer tidak ditemukan.");
    }

    const title = `${data.artist?.name || "Artis"} - ${data.title}`;
    const thumbnail =
      data.album?.cover_xl ||
      data.album?.cover_big ||
      data.album?.cover_medium ||
      data.album?.cover;
    const audioUrl = data.preview;

    if (!audioUrl) {
      throw new Error("Preview audio Deezer tidak tersedia untuk trek ini.");
    }

    return {
      status: true,
      result: {
        title,
        artist: data.artist?.name,
        album: data.album?.title,
        thumbnail,
        type: "audio",
        downloads: [
          {
            type: "audio",
            format: "mp3",
            quality: "320kbps Preview",
            url: audioUrl,
          },
        ],
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
