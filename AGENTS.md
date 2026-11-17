# logven-homepage

The marketing site for logven.com, built with Zola and Sass. Start with `README.md` for commands and structure.

## Copy

The site sells one idea: **centralise your team's data work.** Each person gets simple tools for their own data work; Logven turns that work into one central data lake, keeps it organised, and shows the data you need, including the data you didn't know you had. Repeated tasks become automations that Logven turns into reliable, traceable software. Logven runs on your own servers or in the cloud with European data residency, on small, private AI models.

- Keep new or edited copy consistent with that description and with the existing sections: the problem, how Logven works, what you get, your data stays yours.
- Write plainly and for buyers, not engineers. No month-long setup, no data project: say so when it matters.
- Shared copy lives in `content/` (front matter) and in `templates/index.html`. Update the site description in `zola.toml` when the positioning changes.

## Interaction design

- Keep card containers stationary on hover, especially the model cards. Do not lift or translate the whole card.
- Tool tiles are an exception: a small, smooth scale increase on hover is welcome, with no vertical movement and with soft corners and a faint border highlight.
- Preserve the hover lift and shadow on the example cards in “Work that runs on Logven”; these are another exception to stationary card containers.
- Preserve the original button interactions; do not add hover lifts or change their press effects.
- Subtle movement of icons, illustrations, and other content inside a card is welcome.
- Preserve tool tiles' surface colors on hover. Keep shading restrained; avoid large, dark shadows or pronounced elevation.
- Keep interactions understated and respect reduced motion.
- In the outcomes mosaic, use the same raised surface colors for the table, code, activity, and project previews, including dark mode.
