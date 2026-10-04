const assert = require("assert");
const engine = require("../lib/engine");

console.log("Running self-check...");

// 1. Platform Detection
const testUrls = [
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expectedId: "youtube" },
  { url: "https://youtu.be/dQw4w9WgXcQ", expectedId: "youtube" },
  { url: "https://www.tiktok.com/@user/video/1234567890", expectedId: "tiktok" },
  { url: "https://www.instagram.com/p/C-123456789/", expectedId: "instagram" },
  { url: "https://x.com/jack/status/20", expectedId: "twitter" },
  { url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", expectedId: "spotify" },
  { url: "https://www.facebook.com/watch/?v=10153231379946729", expectedId: "facebook" },
  { url: "https://music.apple.com/us/song/happier/1560735557", expectedId: "applemusic" },
  { url: "https://www.capcut.com/t/Zs82Xtest/", expectedId: "capcut" },
  { url: "https://clips.twitch.tv/ObliviousObservantDunlinRalpherZ", expectedId: "twitch" },
  { url: "https://sck.io/p/test1234", expectedId: "snackvideo" },
  { url: "https://vimeo.com/76979871", expectedId: "vimeo" },
  { url: "https://bsky.app/profile/user.bsky.social/post/3lbtest", expectedId: "bluesky" },
  { url: "https://streamable.com/moo78", expectedId: "streamable" },
  { url: "https://www.snapchat.com/spotlight/W7_EDtest", expectedId: "snapchat" },
  { url: "https://sfile.mobi/test1234", expectedId: "sfile" },
  { url: "https://www.deezer.com/track/3135556", expectedId: "deezer" },
  { url: "https://audiomack.com/artist/song/track", expectedId: "audiomack" },
  { url: "https://likee.video/@user/video/7093444807096327263", expectedId: "likee" },
  { url: "https://www.loom.com/share/d48006b5275a4fc487e47e305e557fc9", expectedId: "loom" },
  { url: "https://tidal.com/browse/track/74695970", expectedId: "tidal" },
  { url: "https://pinterest.com/pin/123456789/", expectedId: "pinterest" },
  { url: "https://soundcloud.com/artist/track", expectedId: "soundcloud" },
  { url: "https://bandcamp.com/album/test", expectedId: "bandcamp" },
  { url: "https://threads.net/@user/post/123", expectedId: "threads" },
  { url: "https://bilibili.com/video/BV123456", expectedId: "bilibili" },
  { url: "https://douyin.com/video/123456", expectedId: "douyin" },
  { url: "https://pixiv.net/artworks/123456", expectedId: "pixiv" },
  { url: "https://rednote.com/discovery/item/123", expectedId: "rednote" },
  { url: "https://terabox.com/s/123456", expectedId: "terabox" },
];

for (const { url, expectedId } of testUrls) {
  const p = engine.detectPlatform(url);
  assert.ok(p, `Platform must be detected for ${url}`);
  assert.strictEqual(p.id, expectedId, `Expected ${expectedId}, got ${p.id}`);
}
console.log(`✓ Platform detection tests passed (${testUrls.length}/${testUrls.length})`);

// 2. State Store
const id = engine.saveState({ foo: "bar" });
assert.strictEqual(engine.getState(id).foo, "bar");
engine.deleteState(id);
assert.strictEqual(engine.getState(id), undefined);
console.log("✓ State store tests passed");

// 3. getDownloads normalization
assert.deepStrictEqual(engine.getDownloads({ downloads: [{ url: "u1" }] }), [{ url: "u1" }]);
assert.deepStrictEqual(engine.getDownloads({ download: "u2", type: "video" }), [{ url: "u2", type: "video" }]);
assert.deepStrictEqual(engine.getDownloads({ url: "u3" }), [{ url: "u3", type: "video" }]);
assert.deepStrictEqual(engine.getDownloads(null), []);
console.log("✓ getDownloads normalization tests passed");

// 4. mediaType helper
assert.strictEqual(engine.mediaType({ type: "video" }), "video");
assert.strictEqual(engine.mediaType({ type: "mp4" }), "video");
assert.strictEqual(engine.mediaType({ type: "mp3" }), "audio");
assert.strictEqual(engine.mediaType({ type: "image" }), "photo");
console.log("✓ mediaType helper tests passed");

console.log("All self-check tests passed successfully!");
