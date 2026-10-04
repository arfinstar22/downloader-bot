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
    let videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $('meta[name="twitter:player:stream"]').attr("content") ||
      $("video").attr("src");

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      "Snapchat Spotlight Video";
    const thumbnail =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    // Parse __NEXT_DATA__ if meta is missing
    if (!videoUrl) {
      const nextData = $("#__NEXT_DATA__").html();
      if (nextData) {
        try {
          const parsed = JSON.parse(nextData);
          const snapInfo =
            parsed.props?.pageProps?.spotlightSnapInfo ||
            parsed.props?.pageProps?.snap ||
            parsed.props?.pageProps?.story;
          if (snapInfo?.mediaUrl || snapInfo?.videoUrl) {
            videoUrl = snapInfo.mediaUrl || snapInfo.videoUrl;
          }
        } catch (_) {}
      }
    }

    // Direct regex scan in page content for cf-st.sc-cdn.net / boltdns / storage.googleapis
    if (!videoUrl) {
      const match = res.data.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i);
      if (match) {
        videoUrl = match[0];
      }
    }

    if (!videoUrl) {
      throw new Error("Gagal mengekstrak video Snapchat dari tautan.");
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
