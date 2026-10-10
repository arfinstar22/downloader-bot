const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Scrapes Likee video metadata and download links
 * @param {string} url - Likee post or short URL
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Likee tidak boleh kosong.");

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };

    let pageRes;
    try {
      pageRes = await axios.get(cleanUrl, {
        headers,
        httpsAgent: agent,
        maxRedirects: 5,
        timeout: 15000,
      });
    } catch (err) {
      if (err.response && err.response.data) {
        pageRes = err.response;
      } else {
        throw err;
      }
    }

    const html = typeof pageRes.data === "string" ? pageRes.data : "";
    const $ = cheerio.load(html);

    // Extract JSON payload from window.data
    let videoData = null;
    const matchData =
      html.match(/window\.data\s*=\s*(\{.+?\});/s) ||
      html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s);

    if (matchData) {
      try {
        videoData = JSON.parse(matchData[1]);
      } catch (_) {}
    }

    let videoUrl =
      videoData?.video_url ||
      videoData?.originVideoInfo?.video_url ||
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content");

    let title =
      videoData?.msgText ||
      videoData?.share_desc ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      "Likee Video";

    let thumbnail =
      videoData?.coverUrl ||
      $('meta[property="og:image"]').attr("content") ||
      null;

    if (!videoUrl) {
      throw new Error(
        "Gagal menemukan stream video Likee. Pastikan video publik atau masih tersedia."
      );
    }

    // Ensure absolute protocol
    if (videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;

    const downloads = [];

    // Watermark-free version: Likee watermarked files typically contain '_4' before file extension
    const noWatermark = videoUrl.replace("_4", "");
    if (noWatermark !== videoUrl) {
      downloads.push({
        type: "video",
        format: "mp4",
        quality: "HD (No Watermark)",
        url: noWatermark,
      });
    }

    downloads.push({
      type: "video",
      format: "mp4",
      quality: "Default",
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
  } catch (err) {
    return {
      status: false,
      message: err.message || "Gagal mengunduh video Likee.",
    };
  }
}

module.exports = { direct: scrape, scrape };

