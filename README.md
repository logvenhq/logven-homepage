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
- `content/` holds page copy in TOML front matter: the homepage FAQ and the source and entity lists for "How it works", the contact page and the model pages. Copy follows the product description: data work, the central data lake, automations that become traceable software, and data that stays yours.
- `sass/css/style.scss` imports the stylesheet partials in cascade order. Zola compiles them to `/css/style.css`.
- `static/js/` contains the header and reveal behaviour, the email copy button, the homepage carousel and the homepage graphics: the hero ribbon (`ribbon.js`, also on the model cards, model pages and call to action) and ledger, the sources and company model (`system.js`), housekeeping (`tidy.js`) and Birdseye (`birdseye.js`).
- `static/fonts/` holds the Latin WOFF2 subset of Geist that the site preloads and serves. It covers the site's text, punctuation, arrows and subscripts. The original Geist variable TTF it was converted from lives in `fonts-src/`, outside `static/`, so it isn't deployed.
- `static/images/` and `static/brand/` contain the images, icons and logo files used by the site. The logo files come from [`logvenhq/logven-identity`](https://github.com/logvenhq/logven-identity). `brand/logven-lockup.png` isn't referenced by the site; it's published for the email signature. Assets in `static/` are copied directly into the build.

The site is light-only, with dark code and Birdseye sections and a dark footer; the header turns light over them. It supports reduced motion, and its content and navigation also work without JavaScript.
