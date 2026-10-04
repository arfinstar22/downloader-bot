const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function scrape(url) {
  try {
    const idMatch = url.match(/vimeo\.com\/(?:video\/|channels\/[^\/]+\/|groups\/[^\/]+\/videos\/)?(\d+)/i);
    if (!idMatch) {
      throw new Error("ID video Vimeo tidak ditemukan dalam tautan.");
    }
    const videoId = idMatch[1];

    let title = "Vimeo Video";
    let thumbnail = null;
    let author = "";

    // 1. Fetch metadata via oEmbed
    try {
      const oembedRes = await axios.get(
        `https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F${videoId}`,
        { httpsAgent, timeout: 8000 }
      );
      if (oembedRes.data) {
        title = oembedRes.data.title || title;
        author = oembedRes.data.author_name || "";
        thumbnail = oembedRes.data.thumbnail_url || null;
      }
    } catch (_) {}

    // 2. Fetch progressive video stream from player config
    const configRes = await axios.get(`https://player.vimeo.com/video/${videoId}/config`, {
      httpsAgent,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://vimeo.com/",
      },
      timeout: 10000,
    });

    const videoData = configRes.data?.video;
    if (videoData?.title) title = videoData.title;
    if (!thumbnail && videoData?.thumbs?.base) thumbnail = videoData.thumbs.base;

    const progressive = configRes.data?.request?.files?.progressive || [];
    const downloads = progressive.map((f) => ({
      type: "video",
      format: "mp4",
      quality: `${f.quality}p`,
      width: f.width,
      height: f.height,
      url: f.url,
    }));

    if (downloads.length === 0) {
      // Check HLS fallback
      const hls = configRes.data?.request?.files?.hls?.cdns;
      if (hls) {
        const firstCdn = Object.values(hls)[0];
        if (firstCdn?.url) {
          downloads.push({
            type: "video",
            format: "m3u8",
            quality: "Auto HLS",
            url: firstCdn.url,
          });
        }
      }
    }

    if (downloads.length === 0) {
      throw new Error("Tidak ada stream video MP4 publik yang tersedia untuk video Vimeo ini.");
    }

    return {
      status: true,
      result: {
        title: author ? `${author} - ${title}` : title,
        thumbnail,
        type: "video",
        downloads,
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
