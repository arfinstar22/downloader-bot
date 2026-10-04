const axios = require("axios");
const cheerio = require("cheerio");

async function scrape(url) {
  try {
    const cleanUrl = url.trim();
    const res = await axios.get(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      timeout: 12000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(res.data);
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      "Audiomack Track";
    let thumbnail =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;
    let audioUrl =
      $('meta[property="og:audio"]').attr("content") ||
      $('meta[name="twitter:player:stream"]').attr("content");

    // Check __NEXT_DATA__
    const nextData = $("#__NEXT_DATA__").html();
    if (nextData) {
      try {
        const parsed = JSON.parse(nextData);
        const music =
          parsed.props?.pageProps?.initialMusic ||
          parsed.props?.pageProps?.music ||
          parsed.props?.pageProps?.track;
        if (music) {
          if (music.title) {
            title = music.artist ? `${music.artist} - ${music.title}` : music.title;
          }
          if (music.image && !thumbnail) thumbnail = music.image;
          if (music.stream_url && !audioUrl) audioUrl = music.stream_url;
          if (music.url && !audioUrl && music.url.includes(".mp3")) audioUrl = music.url;
        }
      } catch (_) {}
    }

    // Direct regex scan for stream / mp3
    if (!audioUrl) {
      const match = res.data.match(/https?:\/\/[^"'\s]+\.audiomack\.com\/[^"'\s]+\.mp3[^"'\s]*/i);
      if (match) audioUrl = match[0];
    }

    if (!audioUrl) {
      // Fallback: search for any secure stream URL
      const streamMatch = res.data.match(/"stream_url":"([^"]+)"/);
      if (streamMatch) {
        audioUrl = streamMatch[1].replace(/\\u002F/g, "/").replace(/\\/g, "");
      }
    }

    if (!audioUrl) {
      throw new Error("Gagal mengekstrak streaming audio dari Audiomack.");
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
            format: "mp3",
            quality: "HD Audio",
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
