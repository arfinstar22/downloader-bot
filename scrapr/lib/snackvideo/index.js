const axios = require("axios");
const cheerio = require("cheerio");

async function scrape(url) {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    };

    const res = await axios.get(url.trim(), {
      headers,
      timeout: 15000,
      maxRedirects: 6,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    let videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $('meta[property="og:video:secure_url"]').attr("content") ||
      $("video").attr("src");

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text().trim() ||
      "SnackVideo";

    const thumbnail =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    // Search for JSON states (window.__INITIAL_STATE__ or similar)
    if (!videoUrl) {
      const scriptContent = $("script").map((i, el) => $(el).html()).get().join("\n");
      const urlMatch =
        scriptContent.match(/"playUrl":"([^"]+)"/) ||
        scriptContent.match(/"photoUrl":"([^"]+)"/) ||
        scriptContent.match(/"src":"(https?:\\\/\\\/[^"]+\.mp4[^"]*)"/);
      if (urlMatch) {
        videoUrl = urlMatch[1].replace(/\\u002F/g, "/").replace(/\\/g, "");
      }
    }

    if (!videoUrl) {
      throw new Error("Gagal mengekstrak video SnackVideo / Kwai dari tautan.");
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
  } catch (error) {
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
