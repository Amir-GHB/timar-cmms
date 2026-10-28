// Timar CMMS Service Worker Registration
(function () {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      var swUrl = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? '/dev-sw.js?dev-sw'
        : '/sw.js';
      navigator.serviceWorker.register(swUrl, { scope: '/' }).catch(function () {});
    });
  }
})();
