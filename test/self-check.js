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
];

for (const { url, expectedId } of testUrls) {
  const p = engine.detectPlatform(url);
  assert.ok(p, `Platform must be detected for ${url}`);
  assert.strictEqual(p.id, expectedId, `Expected ${expectedId}, got ${p.id}`);
}
console.log("✓ Platform detection tests passed (8/8)");

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
