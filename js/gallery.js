// Gallery grid + lightbox. Photo list comes from gallery/photos.js:
//   window.GALLERY_PHOTOS = [{ thumb, full, w, h, alt }, ...]
(function () {
  var photos = window.GALLERY_PHOTOS || [];
  var grid = document.getElementById("gallery");
  var empty = document.getElementById("gallery-empty");
  var box = document.getElementById("lightbox");
  var boxImg = box.querySelector("img");
  var count = box.querySelector(".lb-count");
  var current = 0;
  var lastFocus = null;

  if (!photos.length) {
    empty.hidden = false;
    return;
  }

  photos.forEach(function (p, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Open photo " + (i + 1) + " of " + photos.length);
    var img = document.createElement("img");
    img.src = p.thumb;
    img.alt = p.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    if (p.w && p.h) { img.width = p.w; img.height = p.h; }
    b.appendChild(img);
    b.addEventListener("click", function () { open(i); });
    grid.appendChild(b);
  });

  function show(i) {
    current = (i + photos.length) % photos.length;
    boxImg.src = photos[current].full;
    boxImg.alt = photos[current].alt || "";
    count.textContent = (current + 1) + " / " + photos.length;
    // preload neighbours
    [current + 1, current - 1].forEach(function (n) {
      var pre = new Image();
      pre.src = photos[(n + photos.length) % photos.length].full;
    });
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.classList.add("open");
    document.body.style.overflow = "hidden";
    box.querySelector(".lb-close").focus();
  }

  function close() {
    box.classList.remove("open");
    document.body.style.overflow = "";
    boxImg.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }

  box.querySelector(".lb-close").addEventListener("click", close);
  box.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
  box.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });

  document.addEventListener("keydown", function (e) {
    if (!box.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(current - 1);
    else if (e.key === "ArrowRight") show(current + 1);
  });

  // swipe on touch screens
  var startX = null;
  box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();
