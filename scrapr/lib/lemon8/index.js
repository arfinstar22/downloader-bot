const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes Lemon8 video or photo post metadata and download links
 * @param {string} url - Lemon8 post or short share URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Lemon8 tidak boleh kosong.");

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const pageRes = await axios.get(cleanUrl, {
      headers,
      maxRedirects: 5,
      timeout: 15000,
    });

    const html = pageRes.data;
    const $ = cheerio.load(html);

    let nextData = null;
    const nextScript = $("#__NEXT_DATA__").html();
    if (nextScript) {
      try {
        nextData = JSON.parse(nextScript);
      } catch (_) {}
    }

    const item =
      nextData?.props?.pageProps?.item ||
      nextData?.props?.pageProps?.noteData ||
      null;

    let title =
      item?.title ||
      item?.desc ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().replace(/\| Lemon8.*/i, "").trim() ||
      "Lemon8 Post";

    let thumbnail =
      item?.cover?.url_list?.[0] ||
      $('meta[property="og:image"]').attr("content") ||
      null;

    const downloads = [];

    // Check if video
    const videoUrl =
      item?.video?.downloadAddr ||
      item?.video?.playAddr ||
      item?.video?.play_addr?.url_list?.[0] ||
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content");

    if (videoUrl) {
      downloads.push({
        type: "video",
        format: "mp4",
        quality: "HD (No Watermark)",
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

    // Check if image album
    const imageList = item?.image_list || item?.images || [];
    if (Array.isArray(imageList) && imageList.length > 0) {
      imageList.forEach((img, idx) => {
        const imgUrl = img?.url_list?.[0] || img?.url;
        if (imgUrl) {
          downloads.push({
            type: "image",
            format: "jpg",
            quality: `Photo ${idx + 1}`,
            url: imgUrl,
          });
        }
      });
    }

    if (downloads.length === 0) {
      // Fallback: og:image
      if (thumbnail) {
        downloads.push({
          type: "image",
          format: "jpg",
          quality: "Original",
          url: thumbnail,
        });
      }
    }

    if (downloads.length === 0) {
      throw new Error("Konten Lemon8 tidak ditemukan. Pastikan link publik dan dapat diakses.");
    }

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type: downloads[0].type || "image",
        downloads,
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.message || "Gagal mengunduh postingan Lemon8.",
    };
  }
}

module.exports = { direct: scrape, scrape };
