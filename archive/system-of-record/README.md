# System of record (archived)

The homepage section "A system of record for your data work": a wide card with the copy on the left and a contribution-style field of runs flowing in from the right. Archived on 2026-11-17. This folder sits outside `templates/`, `static/` and `sass/`, so none of it is built or deployed.

- `record.html` is the card markup (was `templates/partials/record.html`).
- `record.scss` holds its styles (was `sass/css/components/_record.scss`).
- `record-grid.js` draws the field of runs on a canvas (was `static/js/record-grid.js`).

To restore it:

1. Move `record.html` back to `templates/partials/`, `record.scss` to `sass/css/components/_record.scss` and `record-grid.js` to `static/js/`.
2. Add `@import "components/record";` back to `sass/css/style.scss`.
3. In `templates/index.html`, add the section back after the "people doing the work" section:
   `<section id="system-of-record" class="block" aria-labelledby="record-title"><div class="container">{% include "partials/record.html" %}</div></section>`
4. Load `js/record-grid.js` with the other deferred scripts at the end of `templates/index.html`.
