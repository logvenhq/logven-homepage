# Logven Homepage

Logven's marketing site, built with [Zola](https://www.getzola.org/) and Sass. It includes the homepage, company and engagement pages, and five model pages. No Node.js dependencies are needed to build or serve it.

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

The complete deployable site is written to `public/`, which is generated and excluded from Git. Deploy that directory to a static host; the production URL is configured in `zola.toml`.

To package the build for delivery:

```sh
tar -czf /tmp/logven-homepage.tar.gz -C public .
```

## Structure

- `templates/base.html` contains the shared navigation, footer, appearance controls and page metadata. `index.html` renders the homepage and `page.html` renders inner pages.
- `templates/partials/` contains the homepage illustrations, FAQ and shared call to action.
- `content/` holds page copy and sections in TOML front matter, including the homepage FAQ.
- `sass/css/style.scss` imports the stylesheet partials in cascade order. Zola compiles them to `/css/style.css`.
- `static/js/` contains the theme controls, header and reveal behavior, plus homepage carousel, copy controls and animations. Homepage interactions load through the homepage's script block.
- `static/fonts/` contains the self-hosted Geist variable font.
- `static/images/` and `static/brand/` contain the images and icons used by the site. Assets in `static/` are copied directly into the build.

The site supports system, light and dark appearance and reduced motion. Its content and navigation also work without JavaScript.
