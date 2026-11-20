"use strict";

(function useLocalPreviewServices() {
  const fetchFromBrowser = window.fetch.bind(window);

  function localDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function availableSlots(params) {
    const start = Number(params.get("startDate"));
    const end = Number(params.get("endDate"));
    const days = {};
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return days;

    const date = new Date(Math.max(start, Date.now()));
    date.setHours(0, 0, 0, 0);
    for (let checked = 0; checked < 32 && date.getTime() < end; checked++) {
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        const slots = [10, 11, 14].map((hour) => {
          const slot = new Date(date);
          slot.setHours(hour, 0, 0, 0);
          return slot;
        }).filter((slot) => slot.getTime() >= start && slot.getTime() > Date.now());
        if (slots.length) days[localDate(date)] = { slots: slots.map((slot) => slot.toISOString()) };
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  function json(data) {
    return Promise.resolve(new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  // Keep the uploaded files and form details in the running page.
  window.fetch = function fetchForPreview(input, options) {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, document.baseURI);
    if (url.hostname !== "realtor-preview.invalid") return fetchFromBrowser(input, options);
    if (url.pathname.endsWith("/free-slots")) return json(availableSlots(url.searchParams));
    return json({ success: true });
  };

  function scrollToSection(hash) {
    const section = document.getElementById(hash.slice(1));
    if (!section) return false;
    section.scrollIntoView({ behavior: "smooth" });
    return true;
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!link || (link.target && link.target !== "_self")) return;
    const href = link.getAttribute("href");
    if (href.startsWith("#") && !href.startsWith("#/") && scrollToSection(href)) {
      event.preventDefault();
    } else if (href.startsWith("/") && !href.startsWith("//")) {
      event.preventDefault();
      window.location.hash = href;
      const anchor = href.indexOf("#");
      if (anchor >= 0) window.setTimeout(() => scrollToSection(href.slice(anchor)), 120);
    }
  });
})();
