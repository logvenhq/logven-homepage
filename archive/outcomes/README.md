# What you get (archived)

The homepage section "What you get": a mosaic of four cards, each with a render of the app (operation cards, a sheet, code with a traced value, the activity heatmap) above a short caption. Archived on 2026-11-17. This folder sits outside `templates/` and `sass/`, so none of it is built or deployed.

- `outcomes.html` is the section markup (was between "How it works" and "Your data stays yours" in `templates/index.html`). It includes `partials/app_operation_cards.html` and `partials/app_sheet_grid.html`, which are archived with "Inside the product" in `archive/inside/partials/`; restore that first. Its styles also need `_app-shot.scss` from there.
- `outcomes.scss` holds its styles (was `sass/css/components/_outcomes.scss`). The dot field it shared with `.block--dots` now lives in `_examples.scss`.
- `responsive.scss` holds its breakpoint rules (were in `sass/css/components/_responsive.scss`).

To restore it:

1. Paste `outcomes.html` back before the `#models` section in `templates/index.html`.
2. Move `outcomes.scss` to `sass/css/components/_outcomes.scss` and add `@import "components/outcomes";` after `components/code` in `sass/css/style.scss`.
3. Copy the rules from `responsive.scss` back into the matching media queries in `_responsive.scss`.
4. Add `.story-card:hover .app-shot.render-shot,` back to the reduced-motion transform list in `_motion.scss`.
