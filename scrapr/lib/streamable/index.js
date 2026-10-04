const axios = require("axios");
const cheerio = require("cheerio");

async function scrape(url) {
  try {
    const codeMatch = url.match(/streamable\.com\/([A-Za-z0-9_-]+)/i);
    if (!codeMatch) {
      throw new Error("Shortcode Streamable tidak valid.");
    }
    const code = codeMatch[1].split("?")[0];

    // 1. Try public Streamable JSON API
    try {
      const res = await axios.get(`https://api.streamable.com/videos/${code}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      });

      if (res.data?.status === 2 && res.data.files) {
        const title = res.data.title || "Streamable Video";
        const thumbnail = res.data.thumbnail_url
          ? res.data.thumbnail_url.startsWith("//")
            ? `https:${res.data.thumbnail_url}`
            : res.data.thumbnail_url
          : null;

        const downloads = [];
        for (const [key, file] of Object.entries(res.data.files)) {
          if (file.url) {
            const fileUrl = file.url.startsWith("//") ? `https:${file.url}` : file.url;
            downloads.push({
              type: "video",
              format: "mp4",
              quality: `${file.height || 720}p`,
              bitrate: file.bitrate,
              url: fileUrl,
            });
          }
        }

        if (downloads.length > 0) {
          downloads.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
          return {
            status: true,
            result: {
              title,
              thumbnail,
              type: "video",
              downloads,
            },
          };
        }
      }
    } catch (_) {}

    // 2. Fallback: Parse Streamable web page
    const pageRes = await axios.get(`https://streamable.com/${code}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(pageRes.data);
    let videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $('meta[name="twitter:player:stream"]').attr("content") ||
      $("video source").attr("src");

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      "Streamable Video";
    const thumbnail = $('meta[property="og:image"]').attr("content") || null;

    if (videoUrl) {
      if (videoUrl.startsWith("//")) videoUrl = `https:${videoUrl}`;
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
    }

    throw new Error("Gagal mengekstrak video dari Streamable.");
  } catch (error) {
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
