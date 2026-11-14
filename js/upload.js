// Guest photo uploader -> Google Apps Script web app -> Google Drive.
// Endpoint + key come from data attributes on #uploader (see share/index.html).
(function () {
  var form = document.getElementById("uploader");
  if (!form) return;
  var endpoint = (form.getAttribute("data-upload-endpoint") || "").trim();
  var key = form.getAttribute("data-upload-key") || "";
  var nameInput = document.getElementById("up-name");
  var fileInput = document.getElementById("up-files");
  var drop = document.getElementById("up-drop");
  var list = document.getElementById("up-list");
  var msg = document.getElementById("up-message");
  var submit = document.getElementById("up-submit");

  var MAX_BYTES = 35 * 1024 * 1024;
  var OK_EXT = /\.(jpe?g|png|heic|heif|webp|gif|tiff?|dng|mp4|mov|m4v|3gp|avi|webm)$/i;
  var items = [];   // { file, li, status: queued|uploading|done|error|skipped }
  var busy = false;

  if (!endpoint) {
    form.classList.add("closed");
    nameInput.disabled = true;
    fileInput.disabled = true;
    submit.disabled = true;
    submit.textContent = "Uploads opening soon";
    return;
  }

  try { nameInput.value = localStorage.getItem("sbpg-guest-name") || ""; } catch (e) {}

  function fmtSize(b) {
    return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  }

  function setStatus(it, status, text, pct) {
    it.status = status;
    it.li.className = "up-item " + status;
    it.li.querySelector(".up-status").textContent = text;
    var bar = it.li.querySelector(".up-bar span");
    bar.style.width = status === "uploading" ? "" : (status === "done" ? 100 : 0) + "%";
  }

  function refresh() {
    var pending = items.filter(function (it) { return it.status === "queued" || it.status === "error"; }).length;
    submit.disabled = busy || pending === 0;
    var failed = items.some(function (it) { return it.status === "error"; });
    submit.textContent = busy ? "Uploading…" : failed ? "Retry failed uploads" :
      pending ? "Upload " + pending + (pending === 1 ? " file" : " files") : "Upload";
  }

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      if (items.some(function (it) { return it.file.name === f.name && it.file.size === f.size && it.status !== "skipped"; })) return;
      var li = document.createElement("li");
      li.innerHTML = '<span class="up-name"></span><span class="up-size"></span><span class="up-status"></span><span class="up-bar"><span></span></span><button type="button" class="up-remove" aria-label="Remove">&times;</button>';
      li.querySelector(".up-name").textContent = f.name;
      li.querySelector(".up-size").textContent = fmtSize(f.size);
      var it = { file: f, li: li, status: "queued" };
      li.querySelector(".up-remove").addEventListener("click", function () {
        if (it.status === "uploading") return;
        items.splice(items.indexOf(it), 1);
        li.remove();
        refresh();
      });
      list.appendChild(li);
      items.push(it);
      var isMedia = /^(image|video)\//.test(f.type) || OK_EXT.test(f.name);
      if (!isMedia) setStatus(it, "skipped", "Not a photo or video");
      else if (f.size > MAX_BYTES) setStatus(it, "skipped", "Too large (max 35 MB)");
      else setStatus(it, "queued", "Ready");
    });
    msg.textContent = "";
    refresh();
  }

  fileInput.addEventListener("change", function () { addFiles(fileInput.files); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
  });
  drop.addEventListener("drop", function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });

  function readBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); resolve(s.slice(s.indexOf(",") + 1)); };
      r.onerror = function () { reject(new Error("Couldn't read the file")); };
      r.readAsDataURL(file);
    });
  }

  function send(it, name) {
    return readBase64(it.file).then(function (data) {
      setStatus(it, "uploading", "Uploading…", null);
      // Must stay a CORS "simple" request: a string body (sent as text/plain), no custom
      // headers and no upload-progress listeners. Anything else triggers a preflight
      // that Apps Script can't answer, and the upload fails.
      return fetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          key: key, name: name, filename: it.file.name,
          mimeType: it.file.type || "", data: data
        })
      }).then(function (r) {
        return r.text().then(function (t) {
          var res = null;
          try { res = JSON.parse(t); } catch (e) {}
          if (r.ok && res && res.ok) return;
          throw new Error(res && res.error ? res.error : "Upload failed");
        });
      }, function () { throw new Error("Connection problem, please try again"); });
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var name = nameInput.value.trim();
    if (!name) {
      msg.textContent = "Please add your name first.";
      msg.className = "up-message warn";
      nameInput.focus();
      return;
    }
    try { localStorage.setItem("sbpg-guest-name", name); } catch (err) {}
    var queue = items.filter(function (it) { return it.status === "queued" || it.status === "error"; });
    if (!queue.length) return;
    busy = true;
    nameInput.disabled = true;
    msg.textContent = "";
    msg.className = "up-message";
    refresh();

    var done = 0, failed = 0;
    // two at a time: quicker than one-by-one, gentle on phone connections
    var next = 0;
    function worker() {
      if (next >= queue.length) return Promise.resolve();
      var it = queue[next++];
      setStatus(it, "uploading", "Preparing…");
      return send(it, name).then(function () {
        done++;
        setStatus(it, "done", "Uploaded ✓");
      }, function (err) {
        failed++;
        setStatus(it, "error", err.message || "Upload failed");
      }).then(worker);
    }
    Promise.all([worker(), worker()]).then(function () {
      busy = false;
      nameInput.disabled = false;
      if (failed) {
        msg.textContent = done + " uploaded, " + failed + " didn’t go through. Tap “Retry failed uploads” to try again.";
        msg.className = "up-message warn";
      } else {
        msg.textContent = "Thank you, " + name + "! " + done + (done === 1 ? " file" : " files") + " uploaded. Feel free to add more.";
        msg.className = "up-message ok";
      }
      refresh();
    });
  });

  window.addEventListener("beforeunload", function (e) {
    if (busy) { e.preventDefault(); e.returnValue = ""; }
  });

  refresh();
})();
