# logven-homepage

The marketing site for logven.com, built with Zola and Sass. Start with `README.md` for commands and structure.

## Copy

The site sells one idea: **centralise your teams' data work.** Each person gets simple tools for their own data work; Logven turns that work into one central data lake, keeps it organised, and shows the data you need, including the data you didn't know you had. Repeated tasks become automations that Logven turns into reliable, traceable software. Logven runs on your own servers or in the cloud with European data residency, on small, private AI models.

- Keep new or edited copy consistent with that description and with the existing sections: the problem, how Logven works, what you get, your data stays yours.
- Write plainly and for buyers, not engineers. No month-long setup, no data project: say so when it matters.
- Shared copy lives in `content/` (front matter) and in `templates/index.html`. Update the site description in `zola.toml` when the positioning changes.

## Interaction design

- Keep card containers stationary on hover, especially the model cards. Do not lift or translate the whole card.
- Preserve the original button interactions; do not add hover lifts or change their press effects.
- Subtle movement of illustrations and other content inside a card is welcome.
- Keep shading restrained; avoid large, dark shadows or pronounced elevation.
- Keep interactions understated and respect reduced motion.

## Graphics

- Every section graphic uses one language: hair-thin grey lines and bands, the data lake's sphere, soft packets that fade to a gradient tail, and the soft ribbon. Black means something Logven made or runs. Small labels sit on hairline ticks, like the hero ledger.
- Colour comes from one palette (`sass/css/base/_tokens.scss`): mostly blue, with violet and a warm orange and amber for movement. No full rainbow. The homepage hero is light (`--hero-surface`): the ledger drifts above the title over the call to action's soft blue ribbon.
- App mockups are welcome when they show the real app: capture it from the running app (2x WebP in `static/images/home/`) rather than redrawing it. Compose them Linear-style on white: real windows overlapping, the back ones quieter, edges fading out, the stage bleeding off the page. Use small radii, a barely-there ring instead of dark borders, one soft wide shadow and faint gradients on and around the surfaces. Use the site font only, with no fake window chrome (no macOS dots). Supporting windows, like a spreadsheet or a document, carry data that matches the capture.
