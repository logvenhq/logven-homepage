# Hero squares (archived)

The animated grid of squares that sat behind the homepage hero, archived on 2026-11-17 when the hero switched to the ledger animation (`static/js/ledger.js`). This folder sits outside `static/` and `sass/`, so none of it is built or deployed.

- `hero-matrix.js` draws the squares on a canvas.
- `hero-matrix.scss` holds its styles, colour token and reduced-motion rule.

To restore it:

1. Move `hero-matrix.js` back to `static/js/` and load it in `templates/base.html` with the other deferred scripts.
2. Add `<canvas class="hero__matrix" data-hero-matrix aria-hidden="true"></canvas>` as the first child of the hero in `templates/index.html`.
3. Copy the rules from `hero-matrix.scss` back into `_hero.scss`, `_tokens.scss` and `_motion.scss`.
