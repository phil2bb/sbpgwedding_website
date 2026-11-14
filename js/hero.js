// Keep faces in the home photo visible: shift the background photo so the point
// at data-face-y (fraction of the photo's height) lands just below the text.
(function () {
  var hero = document.querySelector(".hero");
  var img = hero && hero.querySelector("img[data-face-y]");
  var cta = hero && hero.querySelector(".cta");
  if (!img || !cta) return;
  var faceY = parseFloat(img.getAttribute("data-face-y"));

  function place() {
    if (!img.naturalWidth) return;
    var W = hero.clientWidth, H = hero.clientHeight;
    var scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    var shownH = img.naturalHeight * scale;
    if (shownH - H < 2) { img.style.objectPosition = ""; return; } // nothing to crop vertically
    var textBottom = cta.getBoundingClientRect().bottom - hero.getBoundingClientRect().top;
    // head is ~4% of the photo's height above the face centre; leave a small gap
    var target = textBottom + 36 + 0.045 * shownH;
    target = Math.max(target, H * 0.42);
    target = Math.min(target, H * 0.7);
    var offset = faceY * shownH - target;
    offset = Math.min(Math.max(offset, 0), shownH - H);
    img.style.objectPosition = "50% " + (-Math.round(offset)) + "px";
  }

  if (img.complete) place(); else img.addEventListener("load", place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  var t;
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(place, 100); });
})();
