const axios = require("axios");
const cheerio = require("cheerio");

async function scrape(url) {
  try {
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      Referer: "https://sfile.mobi/",
    };

    const cleanUrl = url.trim();
    const res1 = await axios.get(cleanUrl, { headers, timeout: 12000 });
    const $1 = cheerio.load(res1.data);

    const title =
      $1("h1.intro").text().trim() ||
      $1(".intro").text().trim() ||
      $1("title").text().trim() ||
      "Sfile Document";

    let downloadPageUrl = $1("a#download").attr("href");
    if (!downloadPageUrl) {
      // Find button by text
      $1("a").each((i, el) => {
        const text = $1(el).text();
        const href = $1(el).attr("href");
        if (href && (text.includes("Download") || href.includes("/download/"))) {
          downloadPageUrl = href;
        }
      });
    }

    if (!downloadPageUrl) {
      throw new Error("Tombol unduh Sfile tidak ditemukan pada halaman ini.");
    }

    // Follow to download page / direct link
    let directUrl = downloadPageUrl;
    if (!directUrl.includes("&k=") && !directUrl.includes("redirect=")) {
      const res2 = await axios.get(downloadPageUrl, {
        headers: { ...headers, Referer: cleanUrl },
        timeout: 12000,
      });
      const $2 = cheerio.load(res2.data);
      const finalLink =
        $2("a#download").attr("href") ||
        $2("a.btn-primary").attr("href") ||
        $2("a[href*='download/']").attr("href");
      if (finalLink) directUrl = finalLink;
    }

    const type = title.match(/\.(mp4|mkv|webm|avi)/i)
      ? "video"
      : title.match(/\.(mp3|wav|ogg|m4a)/i)
      ? "audio"
      : "file";

    return {
      status: true,
      result: {
        title,
        thumbnail: null,
        type,
        downloads: [
          {
            type,
            format: type === "video" ? "mp4" : type === "audio" ? "mp3" : "bin",
            quality: "Original",
            url: directUrl,
          },
        ],
      },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
