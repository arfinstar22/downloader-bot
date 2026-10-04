const axios = require("axios");

async function scrape(url) {
  try {
    const slugMatch = url.match(/(?:clips\.twitch\.tv\/|twitch\.tv\/[A-Za-z0-9_]+\/clip\/)([A-Za-z0-9_-]+)/i);
    if (!slugMatch) {
      throw new Error("Format URL Twitch clip tidak valid.");
    }
    const slug = slugMatch[1].split("?")[0];

    const query = `query {
      clip(slug: "${slug}") {
        id
        title
        durationSeconds
        thumbnailURL
        broadcaster { displayName }
        videoQualities {
          quality
          sourceURL
        }
      }
    }`;

    const res = await axios.post(
      "https://gql.twitch.tv/gql",
      { query },
      {
        headers: {
          "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      }
    );

    const clip = res.data?.data?.clip;
    if (!clip) {
      throw new Error("Twitch clip tidak ditemukan atau sudah dihapus.");
    }

    const title = clip.title || "Twitch Clip";
    const broadcaster = clip.broadcaster?.displayName;
    const fullTitle = broadcaster ? `${broadcaster} - ${title}` : title;
    const thumbnail = clip.thumbnailURL || null;

    const downloads = (clip.videoQualities || []).map((vq) => ({
      type: "video",
      format: "mp4",
      quality: `${vq.quality}p`,
      url: vq.sourceURL,
    }));

    if (downloads.length === 0) {
      throw new Error("Tidak ada stream video yang tersedia untuk clip ini.");
    }

    return {
      status: true,
      result: {
        title: fullTitle,
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
