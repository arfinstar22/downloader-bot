const axios = require("axios");

async function scrape(url) {
  try {
    const match = url.match(/bsky\.app\/profile\/([^\/]+)\/post\/([A-Za-z0-9_-]+)/i);
    if (!match) {
      throw new Error("Format URL Bluesky tidak valid (harus: bsky.app/profile/<user>/post/<id>).");
    }

    let [, handle, rkey] = match;
    rkey = rkey.split("?")[0];

    // 1. Resolve handle to DID if not already DID
    let did = handle;
    if (!did.startsWith("did:plc:") && !did.startsWith("did:web:")) {
      const resolveRes = await axios.get(
        `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
        { timeout: 8000 }
      );
      if (resolveRes.data?.did) {
        did = resolveRes.data.did;
      }
    }

    // 2. Fetch post thread
    const atUri = `at://${did}/app.bsky.feed.post/${rkey}`;
    const threadRes = await axios.get(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(atUri)}&depth=0`,
      { timeout: 10000 }
    );

    const post = threadRes.data?.thread?.post;
    if (!post) {
      throw new Error("Post Bluesky tidak ditemukan atau telah dihapus.");
    }

    const text = post.record?.text || "Bluesky Post";
    const author = post.author?.displayName || post.author?.handle || "Bluesky User";
    const title = `${author}: "${text.slice(0, 80)}"`;
    const downloads = [];
    let thumbnail = null;

    // Check embed for video
    const embed = post.embed;
    if (embed) {
      // Direct video embed ($type: app.bsky.embed.video#view)
      if (embed.$type === "app.bsky.embed.video#view" && embed.playlist) {
        thumbnail = embed.thumbnail || null;
        downloads.push({
          type: "video",
          format: "m3u8",
          quality: "HLS Stream",
          url: embed.playlist,
        });
      }

      // Check images
      if (Array.isArray(embed.images)) {
        for (const img of embed.images) {
          if (img.fullsize) {
            if (!thumbnail) thumbnail = img.thumb || img.fullsize;
            downloads.push({
              type: "image",
              format: "jpg",
              quality: "HD",
              url: img.fullsize,
            });
          }
        }
      }

      // Check recordWithMedia
      if (embed.media) {
        if (embed.media.$type === "app.bsky.embed.video#view" && embed.media.playlist) {
          thumbnail = embed.media.thumbnail || thumbnail;
          downloads.push({
            type: "video",
            format: "m3u8",
            quality: "HLS Stream",
            url: embed.media.playlist,
          });
        }
        if (Array.isArray(embed.media.images)) {
          for (const img of embed.media.images) {
            if (img.fullsize) {
              if (!thumbnail) thumbnail = img.thumb || img.fullsize;
              downloads.push({
                type: "image",
                format: "jpg",
                quality: "HD",
                url: img.fullsize,
              });
            }
          }
        }
      }
    }

    if (downloads.length === 0) {
      throw new Error("Tidak ada video atau gambar yang dapat diunduh pada postingan Bluesky ini.");
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
    return { status: false, message: error.message };
  }
}

module.exports = { direct: scrape, scrape };
