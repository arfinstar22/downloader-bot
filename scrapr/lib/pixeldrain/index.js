const axios = require("axios");

/**
 * Scrapes Pixeldrain file metadata and direct download link
 * @param {string} url - Pixeldrain file URL (pixeldrain.com/u/ID or pixeldrain.com/api/file/ID)
 */
async function scrape(url) {
  try {
    const cleanUrl = (url || "").trim();
    if (!cleanUrl) throw new Error("URL Pixeldrain tidak boleh kosong.");

    const idMatch = cleanUrl.match(/pixeldrain\.com\/(?:u|l|api\/file)\/([a-zA-Z0-9_-]+)/i);
    if (!idMatch) {
      throw new Error("Format URL Pixeldrain tidak valid. Gunakan format: pixeldrain.com/u/ID");
    }

    const fileId = idMatch[1];
    const infoRes = await axios.get(`https://pixeldrain.com/api/file/${fileId}/info`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (!infoRes.data || !infoRes.data.success && infoRes.data.value === "not_found") {
      throw new Error("File Pixeldrain tidak ditemukan atau telah dihapus.");
    }

    const data = infoRes.data;
    const title = data.name || `Pixeldrain File (${fileId})`;
    const sizeBytes = data.size || 0;
    const sizeMB = sizeBytes ? (sizeBytes / (1024 * 1024)).toFixed(2) + " MB" : "";
    const mime = (data.mime_type || "").toLowerCase();

    let type = "file";
    if (mime.startsWith("video/")) type = "video";
    else if (mime.startsWith("audio/")) type = "audio";
    else if (mime.startsWith("image/")) type = "image";

    const extMatch = title.match(/\.([a-zA-Z0-9]+)$/);
    const format = extMatch ? extMatch[1].toLowerCase() : (type === "video" ? "mp4" : type === "audio" ? "mp3" : "bin");

    const directDownloadUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
    const thumbnail = type === "image" || type === "video" ? `https://pixeldrain.com/api/file/${fileId}/thumbnail` : null;

    return {
      status: true,
      result: {
        title,
        thumbnail,
        type,
        downloads: [
          {
            type,
            format,
            quality: sizeMB ? `Original (${sizeMB})` : "Original",
            url: directDownloadUrl,
            size: sizeMB || undefined,
          },
        ],
      },
    };
  } catch (error) {
    return {
      status: false,
      message: error.response?.data?.message || error.message || "Gagal mengunduh file Pixeldrain.",
    };
  }
}

module.exports = { direct: scrape, scrape };
