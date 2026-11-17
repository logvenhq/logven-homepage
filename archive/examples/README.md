# Work that runs on Logven (archived)

The homepage section "Work that runs on Logven": two rows of example worker cards drifting in opposite directions over a dotted wash. Archived on 2026-11-17. This folder sits outside `templates/` and `sass/`, so none of it is built or deployed.

- `examples.html` is the section markup (was between "Every automation is written as code" and "Questions" in `templates/index.html`).
- `examples.scss` holds its styles (was `sass/css/components/_examples.scss`), plus the `.tag` rule from `_product.scss` and a note of its two reduced-motion rules from `_motion.scss`.

To restore it:

1. Paste `examples.html` back before the `#faq` section in `templates/index.html`.
2. Move the styles to `sass/css/components/_examples.scss` (the `.tag` rule can stay there) and add `@import "components/examples";` after `components/code` in `sass/css/style.scss`.
3. In the reduced-motion block of `_motion.scss`, add `.wall__track` back next to `[data-reveal-text].is-visible` (`animation: none`) and `.example` back to the `transform: none !important` list.
