const axios = require("axios");
const vm = require("vm");

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getGofileToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) {
    return cachedToken;
  }
  const { data } = await axios.post("https://api.gofile.io/accounts", {}, { timeout: 10000 });
  if (data?.data?.token) {
    cachedToken = data.data.token;
    cachedTokenExpiry = now + 12 * 3600 * 1000;
    return cachedToken;
  }
  return null;
}

async function getWT() {
  try {
    const { data: code } = await axios.get("https://gofile.io/js/wt.obf.js", { timeout: 10000 });
    const ctx = {
      window: {},
      navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      document: { location: { href: "https://gofile.io" } },
    };
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    if (typeof ctx.generateWT === "function") {
      return ctx.generateWT();
    }
  } catch (_) {}
  return "4fd6sg89d7s6";
}

/**
 * Scrapes Gofile file metadata and direct download link
 * @param {string} url - Gofile URL (e.g. https://gofile.io/d/ID)
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Gofile tidak boleh kosong.");

    const idMatch = cleanUrl.match(/gofile\.io\/d\/([a-zA-Z0-9_-]+)/i);
    if (!idMatch) {
      throw new Error("Format URL Gofile tidak valid. Gunakan format: gofile.io/d/ID");
    }

    const contentId = idMatch[1];
    const token = await getGofileToken();
    const wt = await getWT();

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };
    if (token) headers.Authorization = "Bearer " + token;

    const res = await axios.get(`https://api.gofile.io/contents/${contentId}?wt=${wt}`, {
      headers,
      timeout: 15000,
    });

    if (!res.data || res.data.status !== "ok" || !res.data.data) {
      const errStatus = res.data?.status || "error";
      throw new Error(`Gagal mengambil konten Gofile (${errStatus}). File mungkin private atau telah dihapus.`);
    }

    const data = res.data.data;
    const children = data.children ? Object.values(data.children) : [data];
    if (children.length === 0) {
      throw new Error("Folder Gofile kosong.");
    }

    const file = children[0];
    const title = file.name || data.name || `Gofile (${contentId})`;
    const sizeBytes = file.size || data.size || 0;
    const sizeMB = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) + " MB" : "";
    const directUrl = file.link || data.link;

    if (!directUrl) {
      throw new Error("Link unduhan langsung Gofile tidak ditemukan.");
    }

    const mime = (file.mimetype || file.type || "").toLowerCase();
    let type = "file";
    if (mime.includes("video")) type = "video";
    else if (mime.includes("audio")) type = "audio";
    else if (mime.includes("image")) type = "image";

    const extMatch = title.match(/\.([a-zA-Z0-9]+)$/);
    const format = extMatch ? extMatch[1].toLowerCase() : (type === "video" ? "mp4" : type === "audio" ? "mp3" : "bin");

    return {
      status: true,
      result: {
        title,
        thumbnail: file.thumbnail || null,
        type,
        downloads: [
          {
            type,
            format,
            quality: sizeMB ? `Original (${sizeMB})` : "Original",
            url: directUrl,
            size: sizeMB || undefined,
          },
        ],
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || "Gagal mengunduh file Gofile.",
    };
  }
}

module.exports = { direct: scrape, scrape };
