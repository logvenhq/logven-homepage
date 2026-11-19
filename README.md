# Logven Homepage

The marketing site for [logven.com](https://logven.com). Logven centralises teams' data work: each person gets simple tools for their own data work, and Logven turns that work into one central data lake, keeps it organised and shows the data you need, including the data you didn't know you had. It runs on your own servers or in the cloud with European data residency, on small, private AI models.

The site is built with [Zola](https://www.getzola.org/) and Sass. It has the homepage, the contact page (`/start-a-pilot/` redirects there) and five model pages. No Node.js dependencies are needed to build or serve it.

## Local development

Install Zola (validated with 0.22.1), then run:

```sh
zola serve
```

Open `http://127.0.0.1:1111`. Zola watches content, templates, styles and static assets for changes.

## Production build

```sh
zola check
zola build
```

The complete deployable site is written to `public/`, which is generated and excluded from Git. Deploy that directory to a static host; the production URL and site description are configured in `zola.toml`.

To package the build for delivery:

```sh
tar -czf /tmp/logven-homepage.tar.gz -C public .
```

## Structure

- `templates/base.html` contains the shared header, footer and page metadata. `index.html` renders the homepage, `contact.html` the contact page and `page.html` the five model pages.
- `templates/partials/` contains the inline logo, pricing, the FAQ and the shared call to action.
- `content/` holds page copy in TOML front matter: the homepage FAQ, the contact page and the model pages. Copy follows the product description: data work, the central data lake, automations that become traceable software, and data that stays yours.
- `sass/css/style.scss` imports the stylesheet partials in cascade order. Zola compiles them to `/css/style.css`.
- `static/js/` contains the header and reveal behaviour, the email copy button, the homepage carousel and the homepage graphics: the hero ledger (`ledger.js`), the soft ribbon behind the hero ledger and on the model cards, model pages and call to action (`ribbon.js`), housekeeping (`tidy.js`), Birdseye (`birdseye.js`) and the branches that gather the data an analysis needs (`roots.js`).
- `static/fonts/` holds the Latin WOFF2 subset of Geist that the site preloads and serves. It covers the site's text, punctuation, arrows and subscripts. The original Geist variable TTF it was converted from lives in `fonts-src/`, outside `static/`, so it isn't deployed.
- `templates/partials/mockup.html` is the "How it works" composition: a spreadsheet and a procedure document drawn in HTML, with a capture of the real app's board in front (`static/images/home/app-board.webp`, 1440 × 900 at 2x). Recapture it from the running app when the board UI changes.
- `static/images/` and `static/brand/` contain the images, icons and logo files used by the site. The logo files come from [`logvenhq/logven-identity`](https://github.com/logvenhq/logven-identity). `brand/logven-lockup.png` isn't referenced by the site; it's published for the email signature. Assets in `static/` are copied directly into the build.

The site is light-only, with a light homepage hero, dark code and Birdseye sections and a dark footer; the header turns light over them. The graphics take their colours from one palette in `sass/css/base/_tokens.scss`. It supports reduced motion, and its content and navigation also work without JavaScript.
