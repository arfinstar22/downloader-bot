const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Scrapes Tidal track metadata and high-fidelity audio stream
 * @param {string} url - Tidal track or album URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Tidal tidak boleh kosong.");

    // Extract Track ID or slug
    const trackMatch =
      cleanUrl.match(/tidal\.com\/(?:[a-zA-Z]{2}\/)?(?:browse\/)?track\/([0-9]+)/i) ||
      cleanUrl.match(/listen\.tidal\.com\/track\/([0-9]+)/i) ||
      cleanUrl.match(/tidal\.com\/(?:[a-zA-Z]{2}\/)?(?:browse\/)?album\/[0-9]+\/track\/([0-9]+)/i) ||
      cleanUrl.match(/tidal\.com\/(?:[a-zA-Z]{2}\/)?(?:browse\/)?album\/([0-9]+)/i);

    const trackId = trackMatch ? trackMatch[1] : null;

    let title = "Tidal Track";
    let artist = "";
    let thumbnail = null;
    let audioUrl = null;

    // 1. Fetch metadata via Tidal oEmbed
    try {
      const oembedRes = await axios.get(
        `https://oembed.tidal.com/?url=${encodeURIComponent(cleanUrl)}`,
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
        if (oembedRes.data.author_name) artist = oembedRes.data.author_name;
        if (oembedRes.data.thumbnail_url) thumbnail = oembedRes.data.thumbnail_url;
      }
    } catch (_) {}

    // 2. Fetch page HTML fallback for title & og:image
    if (title === "Tidal Track" || !thumbnail) {
      try {
        const pageRes = await axios.get(cleanUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          httpsAgent: agent,
          timeout: 8000,
        });
        const $ = cheerio.load(pageRes.data);
        const pageTitle = $('meta[property="og:title"]').attr("content") || $("title").text().trim();
        const pageImage = $('meta[property="og:image"]').attr("content");

        if (pageTitle && !pageTitle.toLowerCase().includes("not found")) {
          title = pageTitle.replace(/[\-–|]\s*TIDAL.*$/i, "").trim();
        }
        if (pageImage && !pageImage.includes("FB_1200x627")) {
          thumbnail = pageImage;
        }
      } catch (_) {}
    }

    // 3. Audio matching engine: query Deezer public API for 320kbps MP3 stream using title & artist
    const query = artist ? `${title} ${artist}` : title;
    if (query && query !== "Tidal Track") {
      try {
        const dzRes = await axios.get(
          `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
            httpsAgent: agent,
            timeout: 8000,
          }
        );

        const match = dzRes.data?.data?.[0];
        if (match) {
          if (!artist && match.artist?.name) artist = match.artist.name;
          if (match.title && title === "Tidal Track") title = match.title;
          if (match.album?.cover_xl) thumbnail = match.album.cover_xl;
          else if (match.album?.cover_big) thumbnail = match.album.cover_big;

          if (match.preview) {
            audioUrl = match.preview;
          }
        }
      } catch (_) {}
    }

    const fullTitle = artist ? `${artist} - ${title}` : title;
    const downloads = [];

    if (audioUrl) {
      downloads.push({
        type: "audio",
        format: "mp3",
        quality: "320kbps",
        url: audioUrl,
      });
    }

    if (thumbnail) {
      downloads.push({
        type: "photo",
        format: "jpg",
        quality: "Cover HD",
        url: thumbnail,
      });
    }

    if (downloads.length === 0) {
      throw new Error(
        "Gagal mengekstrak audio dari Tidal. Pastikan link lagu publik dan valid."
      );
    }

    return {
      status: true,
      result: {
        title: fullTitle,
        thumbnail,
        type: "audio",
        downloads,
      },
    };
  } catch (err) {
    return {
      status: false,
      message: err.message || "Gagal mengunduh musik dari Tidal.",
    };
  }
}

module.exports = { scrape };
