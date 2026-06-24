(function () {
  var ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref) return;

  var storageKey = "sentralyx_affiliate_visitor_id";
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(storageKey, visitorId);
  }

  var sessionKey = "sentralyx_affiliate_click_tracked_" + ref;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");

  var payload = {
    affiliate_code: ref,
    landing_page: window.location.href,
    referrer: document.referrer || null,
    visitor_id: visitorId,
  };

  fetch("https://qpyphzabiyqzitqtqxex.supabase.co/functions/v1/track-affiliate-click-v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(function (err) {
    console.warn("Affiliate tracking error:", err);
  });
})();