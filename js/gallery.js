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

  var buttons = photos.map(function (p, i) {
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
    return b;
  });

  // Masonry: put each photo into the currently shortest column (by aspect ratio),
  // so the order runs across the page rather than down each column.
  var colCount = 0;
  function layout() {
    var w = grid.clientWidth;
    var n = w < 600 ? 2 : w < 900 ? 2 : w < 1300 ? 3 : 4;
    if (window.innerWidth <= 600) n = 2;
    if (n === colCount) return;
    colCount = n;
    grid.innerHTML = "";
    var cols = [], heights = [];
    for (var c = 0; c < n; c++) {
      var col = document.createElement("div");
      col.className = "gallery-col";
      grid.appendChild(col);
      cols.push(col);
      heights.push(0);
    }
    buttons.forEach(function (b, i) {
      var p = photos[i];
      var k = heights.indexOf(Math.min.apply(null, heights));
      cols[k].appendChild(b);
      heights[k] += (p.w && p.h ? p.h / p.w : 1) + 0.03;
    });
  }
  layout();
  var t;
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(layout, 150); });

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
