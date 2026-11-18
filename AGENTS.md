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
- Colour comes from one palette (`sass/css/base/_tokens.scss`): mostly blue, with violet and a warm orange and amber for movement. No full rainbow. The homepage hero is light (`--hero-surface`): the ledger drifts above the title, and the title's chips open its words apart.
- Titles may carry title chips (`templates/macros/chip.html`): small glossy blue, violet or orange tiles with a white glyph. They're decoration; the title must read the same without them.
- No app mockups or dashboard-style diagrams.
