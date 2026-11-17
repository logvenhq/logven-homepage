# Cube animations (archived)

The isometric cube animations at the top of the three "How it works" cards on the homepage (Tools for each person, One data lake, Automation): coloured cubes sliding and stacking on a soft isometric grid. Archived on 2026-11-17, when the cards switched to the line drawings in `static/js/rays.js`. This folder sits outside `templates/` and `sass/`, so none of it is built or deployed.

- `cubes.js` draws the scenes (was `static/js/cubes.js`). Its "tidy" scene was already unused.
- `cubes.scss` holds the `.cubes` styles (were in `sass/css/components/_platform.scss`).

To restore it:

1. Move `cubes.js` back to `static/js/cubes.js` and, in the script block at the bottom of `templates/index.html`, re-add `<script src="{{ get_url(path='js/cubes.js', cachebust=true) }}" defer></script>` (in place of `rays.js`).
2. In `#how-it-works`, replace the three `<svg class="rays" …>` elements inside `.blocks__art` with:
   - `<svg class="cubes" data-cubes="sheets" data-cubes-color="workers" viewBox="-103 -50 220 132" aria-hidden="true"></svg>`
   - `<svg class="cubes" data-cubes="models" data-cubes-color="sheets" viewBox="-103 -50 220 132" aria-hidden="true"></svg>`
   - `<svg class="cubes" data-cubes="workers" data-cubes-color="models" viewBox="-103 -50 220 132" aria-hidden="true"></svg>`
3. Paste `cubes.scss` back into `sass/css/components/_platform.scss`, after `.blocks__art`.
