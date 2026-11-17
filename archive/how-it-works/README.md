# Logven starts with the people doing the work (archived)

The homepage section `#how-it-works`: three cards (Tools for each person, One data lake, Automation), each with an animated line drawing on top and copy below. Archived on 2026-11-17, as it was. This folder sits outside `templates/`, `static/` and `sass/`, so none of it is built or deployed.

- `how-it-works.html` is the section markup (was the section after the problem section in `templates/index.html`).
- `rays.js` draws the line animations (was `static/js/rays.js`).
- `rays.scss` and `platform.scss` hold the styles (were `sass/css/components/_rays.scss` and `_platform.scss`).
- The earlier cube animations for these cards are in `archive/cubes/`.

To restore it:

1. Paste `how-it-works.html` back after the `#product` section in `templates/index.html`.
2. Move `rays.js` back to `static/js/` and add `<script src="{{ get_url(path='js/rays.js', cachebust=true) }}" defer></script>` to the script block at the bottom of `templates/index.html`.
3. Move the styles back to `sass/css/components/_platform.scss` and `_rays.scss`, and add `@import "components/platform";` and `@import "components/rays";` after `components/flow` in `sass/css/style.scss`.

The hero's "How it works" button and the footer's "How it works" link still point at `#how-it-works`.
