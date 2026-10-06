const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes Tumblr video, GIF, or image post metadata and download links
 * @param {string} url - Tumblr post URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Tumblr tidak boleh kosong.");

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    let title = "Tumblr Post";
    let thumbnail = null;

    // 1. Try oEmbed for clean title and thumbnail
    try {
      const oembedRes = await axios.get(
        `https://www.tumblr.com/oembed/1.0?url=${encodeURIComponent(cleanUrl)}`,
        { headers, timeout: 8000 }
      );
      if (oembedRes.data) {
        if (oembedRes.data.title) title = oembedRes.data.title;
        if (oembedRes.data.thumbnail_url) thumbnail = oembedRes.data.thumbnail_url;
      }
    } catch (_) {}

    // 2. Fetch HTML page
    const pageRes = await axios.get(cleanUrl, {
      headers,
      timeout: 12000,
      maxRedirects: 5,
    });

    const html = pageRes.data;
    const $ = cheerio.load(html);

    if (title === "Tumblr Post") {
      title =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().replace(/\| Tumblr.*/i, "").trim() ||
        title;
    }

    if (!thumbnail) {
      thumbnail = $('meta[property="og:image"]').attr("content") || null;
    }

    const downloads = [];

    // Check for video in og:video or video tag
    let videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $("video source").attr("src") ||
      $("video").attr("src");

    if (!videoUrl) {
      const match = html.match(/https?:\/\/va\.media\.tumblr\.com\/[^\s"']+\.mp4[^\s"']*/i);
      if (match) videoUrl = match[0];
    }

    if (videoUrl) {
      downloads.push({
        type: "video",
        format: "mp4",
        quality: "HD",
        url: videoUrl,
      });
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

    // Check for image or GIF
    const imgUrls = [];
    $('article img, .post img, meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("content");
      if (src && src.includes("media.tumblr.com") && !imgUrls.includes(src)) {
        imgUrls.push(src);
      }
    });

    if (imgUrls.length > 0) {
      imgUrls.forEach((img, idx) => {
        downloads.push({
          type: "image",
          format: img.includes(".gif") ? "gif" : "jpg",
          quality: `Image ${idx + 1}`,
          url: img,
        });
      });
    } else if (thumbnail) {
      downloads.push({
        type: "image",
        format: "jpg",
        quality: "Original",
        url: thumbnail,
      });
    }

    if (downloads.length === 0) {
      throw new Error("Konten video atau gambar Tumblr tidak ditemukan. Pastikan postingan publik.");
    }

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type: downloads[0].type,
        downloads,
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Gagal mengunduh postingan Tumblr.",
    };
  }
}

module.exports = { direct: scrape, scrape };
