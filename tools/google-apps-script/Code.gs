/**
 * Wedding photo uploads -> Google Drive (no login for guests).
 *
 * SETUP (one time):
 *   1. Go to https://script.google.com  ->  New project.
 *   2. Delete everything in Code.gs and paste this whole file in. Save.
 *   3. Deploy -> New deployment -> gear icon -> "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Click Deploy, then "Authorize access" and allow it to use your Drive.
 *      (Google may warn "Google hasn't verified this app" - click Advanced ->
 *       "Go to <project> (unsafe)". It's your own script, so that's expected.)
 *   4. Copy the "Web app" URL (ends in /exec) and put it in
 *      share/index.html  ->  data-upload-endpoint="..."
 *
 * Photos are saved to a Drive folder called FOLDER_NAME (created automatically),
 * with one sub-folder per guest name.
 *
 * If you change this code later: Deploy -> Manage deployments -> pencil icon ->
 * Version: "New version" -> Deploy. (That keeps the same URL.)
 */

const FOLDER_NAME = "Wedding Guest Uploads";
// Optional: paste a specific Drive folder ID here instead (from its URL).
const FOLDER_ID = "1J46xns1RwnUS8m_9y3uZNMOrLVinZxmZ";
// Must match data-upload-key in share/index.html. Stops random bots, not a password.
const UPLOAD_KEY = "sbpg-2026-07-31";
// Apps Script accepts ~50 MB per request; base64 adds a third, so ~36 MB per file.
const MAX_BYTES = 36 * 1024 * 1024;

const OK_EXT = ["jpg", "jpeg", "png", "heic", "heif", "webp", "gif", "tif", "tiff", "dng",
                "mp4", "mov", "m4v", "3gp", "avi", "webm"];

function doGet() {
  return json_({ ok: true, service: "wedding-uploads", folder: rootFolder_().getName() });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.key !== UPLOAD_KEY) return json_({ ok: false, error: "Not allowed" });

    const guest = clean_(body.name).slice(0, 60) || "Guest";
    const filename = clean_(body.filename).slice(0, 120) || "upload";
    const type = String(body.mimeType || "");
    const ext = (filename.split(".").pop() || "").toLowerCase();
    if (!(type.indexOf("image/") === 0 || type.indexOf("video/") === 0 || OK_EXT.indexOf(ext) >= 0)) {
      return json_({ ok: false, error: "Only photos and videos can be uploaded" });
    }

    const bytes = Utilities.base64Decode(String(body.data || ""));
    if (!bytes.length) return json_({ ok: false, error: "Empty file" });
    if (bytes.length > MAX_BYTES) return json_({ ok: false, error: "File is too large" });

    const folder = guestFolder_(guest);
    const blob = Utilities.newBlob(bytes, type || "application/octet-stream", guest + " - " + filename);
    const file = folder.createFile(blob);
    return json_({ ok: true, id: file.getId() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function rootFolder_() {
  if (FOLDER_ID) return DriveApp.getFolderById(FOLDER_ID);
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty("folderId");
  if (saved) {
    try { return DriveApp.getFolderById(saved); } catch (e) { /* deleted - recreate */ }
  }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty("folderId", folder.getId());
  return folder;
}

function guestFolder_(guest) {
  // lock so two uploads at once don't create two folders for the same guest
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const root = rootFolder_();
    const it = root.getFoldersByName(guest);
    return it.hasNext() ? it.next() : root.createFolder(guest);
  } finally {
    lock.releaseLock();
  }
}

function clean_(s) {
  return String(s || "").replace(/[\\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
