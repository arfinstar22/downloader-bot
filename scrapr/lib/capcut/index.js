const axios = require("axios");
const qs = require("querystring");

async function scrape(url) {
  try {
    const cleanUrl = url.trim();

    // Source 1: 3bic API
    try {
      const res1 = await axios.post(
        "https://3bic.com/api/download",
        { url: cleanUrl },
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Origin: "https://3bic.com",
            Referer: "https://3bic.com/",
          },
          timeout: 12000,
        }
      );

      if (res1.data?.originalVideoUrl) {
        let videoUrl = res1.data.originalVideoUrl;
        try {
          const b64Part = String(videoUrl).split("/").pop();
          const decoded = Buffer.from(b64Part, "base64").toString("utf-8");
          if (decoded && decoded.startsWith("http")) videoUrl = decoded;
        } catch (_) {}

        return {
          status: true,
          result: {
            title: res1.data.title || "CapCut Video",
            author: res1.data.authorName || "CapCut Creator",
            thumbnail: res1.data.coverUrl || null,
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
    } catch (_) {}

    // Source 2: capdownloader API
    try {
      const res2 = await axios.post(
        "https://capdownloader.com/api/video-data.php",
        qs.stringify({ url: cleanUrl }),
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: "https://capdownloader.com/",
          },
          timeout: 12000,
        }
      );

      if (!res2.data?.error && Array.isArray(res2.data?.medias)) {
        const mp4 = res2.data.medias.find((m) => m.extension === "mp4");
        if (mp4?.url) {
          const finalUrl = mp4.url.startsWith("/")
            ? `https://capdownloader.com${mp4.url}`
            : mp4.url;
          return {
            status: true,
            result: {
              title: res2.data.title || "CapCut Video",
              author: "CapCut Creator",
              thumbnail: res2.data.thumbnail || null,
              type: "video",
              downloads: [
                {
                  type: "video",
                  format: "mp4",
                  quality: mp4.quality || "HD",
                  url: finalUrl,
                },
              ],
            },
          };
        }
      }
    } catch (_) {}

    // Source 3: Direct page HTML meta parsing (fallback)
    const pageRes = await axios.get(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const cheerio = require("cheerio");
    const $ = cheerio.load(pageRes.data);
    const videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $("video").attr("src");
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      "CapCut Video";
    const thumbnail = $('meta[property="og:image"]').attr("content") || null;

    if (videoUrl) {
      return {
        status: true,
        result: {
          title,
          thumbnail,
          type: "video",
          downloads: [{ type: "video", format: "mp4", quality: "HD", url: videoUrl }],
        },
      };
    }

    throw new Error("Gagal mengekstrak video CapCut.");
  } catch (error) {
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
