# Logven Homepage

The marketing site for [logven.com](https://logven.com). Logven centralises a team's data work: each person gets simple tools for their own data work, and Logven turns that work into one central data bank, keeps it organised and shows the data you need, including the data you didn't know you had. It runs on your own servers or in the cloud with European data residency, on small, private AI models.

The site is built with [Zola](https://www.getzola.org/) and Sass. It has the homepage, the contact page (`/start-a-pilot/` redirects there), five model pages and the brand guidelines page. No Node.js dependencies are needed to build or serve it.

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

- `templates/base.html` contains the shared navigation, footer, appearance controls and page metadata. `index.html` renders the homepage, `page.html` renders inner pages and `brand.html` renders the brand guidelines.
- `templates/partials/` contains the product previews (app home, sheet, record), pricing, the FAQ, the inner page header and the shared call to action.
- `content/` holds page copy and sections in TOML front matter, including the homepage FAQ. Copy follows the product description: data work, the central data bank, automations that become traceable software, and data that stays yours.
- `sass/css/style.scss` imports the stylesheet partials in cascade order. Zola compiles them to `/css/style.css`.
- `static/js/` contains the theme controls, header and reveal behavior, plus the homepage carousel, copy controls and animations. Homepage interactions load through the homepage's script block.
- `static/fonts/` holds the Latin WOFF2 subset of Geist that the site preloads and serves. It covers the site's text, punctuation, arrows and subscripts. The original Geist variable TTF it was converted from lives in `fonts-src/`, outside `static/`, so it isn't deployed.
- `static/images/` and `static/brand/` contain the images and icons used by the site. `static/brand/` also holds the downloads offered on `/brand/`: the logo files, the zipped brand kit and the design tokens, which come from [`logvenhq/logven-identity`](https://github.com/logvenhq/logven-identity). Assets in `static/` are copied directly into the build.

The site uses the light theme by default (the dark styles stay in place for when the appearance switcher returns) and supports reduced motion. Its content and navigation also work without JavaScript.
