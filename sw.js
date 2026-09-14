/* 일일브리핑 LIVE 서비스워커 — 셸은 네트워크 우선(항상 최신), 아이콘 등 자산은 캐시 우선.
   시세/허브/외부 API 는 캐시하지 않고 그대로 네트워크로 보낸다. */
const C = "brief-shell-v1";
const ASSETS = ["./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { if (k !== C) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (u.origin !== location.origin) return;               // 허브·데이터·바이낸스 등 외부는 그냥 통과
  // HTML 문서: 네트워크 우선(최신 유지) + 실패 시 캐시로 오프라인 표시
  if (req.mode === "navigate" || u.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(req).then(function (res) {
        var cc = res.clone(); caches.open(C).then(function (c) { c.put(req, cc); }); return res;
      }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match("./live.html"); }); })
    );
    return;
  }
  // 그 외 같은 오리진 자산: 캐시 우선
  e.respondWith(caches.match(req).then(function (r) {
    return r || fetch(req).then(function (res) {
      var cc = res.clone(); caches.open(C).then(function (c) { c.put(req, cc); }); return res;
    });
  }));
});
