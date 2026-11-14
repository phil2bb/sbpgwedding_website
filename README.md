# Steph & Phil's Wedding — www.sbpgwedding.com

Static site hosted on GitHub Pages from the `main` branch (custom domain set in `CNAME`).
The original Squarespace site is preserved on the `original_site` branch.

## Pages
- `index.html` — Home
- `gallery/` — photo gallery with a full-screen viewer
- `share/` — where guests upload their photos

Shared styling is in `css/style.css` (Marcellus + PT Serif, terracotta `#d4967d`, linen `#e5e3dc`).

## Adding photos to the gallery
Requires Python with Pillow (`pip install pillow`; add `pillow-heif` for iPhone HEIC files).

```
python tools/add_photos.py "C:/path/to/folder/of/photos"
git add gallery && git commit -m "Add photos" && git push
```

The script makes web-sized copies and thumbnails (rotation fixed, location data removed)
in `gallery/photos/` and rebuilds `gallery/photos.js`, sorted by when each photo was taken.
To remove a photo, delete it from both `gallery/photos/full` and `gallery/photos/thumbs`, then run
`python tools/add_photos.py` with no folder.

## Guest upload link
Set `data-upload-url` on the upload button in `share/index.html`. While it is empty the button
reads "Upload opening soon".
