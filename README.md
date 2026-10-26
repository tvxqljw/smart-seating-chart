# Smart Seating Chart — modular source (V18)

## Files
- `index.html` — page markup, loads the ES module entry point
- `styles.css` — styling
- `app.js` — UI, event handlers, chart rendering and editing
- `classroom.js` — classroom defaults, seat IDs
- `templates.js` — built-in Classroom 12 and blank template definitions
- `seating.js` — shuffle scoring and generation
- `storage.js` — saved-state validation and browser storage

## Run locally
ES modules should be served over HTTP(S), not opened with `file://`.
From this directory run `python3 -m http.server 8000` and open http://localhost:8000/.
GitHub Pages supports ES modules without additional build tools.

## Compatibility
The same localStorage keys and JSON shape as V17 are retained. The page must run at the same origin to see previous data.

## Testing
Syntax checked with Node. Browser UI regression tests are still needed before production use.

### Developer tools

Developer Mode is hidden by default. To edit classroom templates, append `?developer=1` to the page URL (for example `http://localhost:8000/?developer=1`). This reveals the Developer Mode button. This is a convenience toggle, not an access-control or security mechanism.
