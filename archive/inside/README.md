# Inside the product (archived)

The homepage section "Inside the product": recreations of the app's home page and a sheet on a fading stage, with four notes (Sheets, Workers, Boards, Processes) below. Archived on 2026-11-17. This folder sits outside `templates/` and `sass/`, so none of it is built or deployed.

- `inside.html` is the section markup (was between "Your data stays yours" and "It stays tidy as it grows" in `templates/index.html`).
- `partials/` holds the app recreations it includes (were in `templates/partials/`).
- `app-shot.scss` holds their styles (was `sass/css/components/_app-shot.scss`). Its icons are still in `static/images/app/`.
- `stage.scss` holds the stage rules (were in `_product.scss` and `_responsive.scss`). The `.notes` and `.note` styles stay in `_product.scss`, since "It stays tidy" uses them.

To restore it:

1. Move `partials/*.html` back to `templates/partials/` and `app-shot.scss` to `sass/css/components/_app-shot.scss`, then add `@import "components/app-shot";` at the end of `sass/css/style.scss` (before `components/housekeeping`).
2. Copy the rules from `stage.scss` back into `_product.scss` and the 760px query in `_responsive.scss`.
3. Paste `inside.html` back before the `#housekeeping` section in `templates/index.html`.
4. Add `<li><a href="{{ home }}#inside">Inside the product</a></li>` back to the Product column of the footer in `templates/base.html`.
