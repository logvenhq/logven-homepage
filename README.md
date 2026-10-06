# Logven Homepage

A focused, one-page marketing site built with [Zola](https://www.getzola.org/) and vanilla CSS.

## Local development

```sh
zola serve
```

The site is available at `http://127.0.0.1:1111`.

## Production build

```sh
zola build
```

Generated files are written to `public/`.

## Structure

- `templates/` contains the shared page shell (`base.html`), the homepage (`index.html`), the
  inner-page template (`page.html`) and the FAQ and call-to-action partials.
- `content/` holds the homepage FAQ and the inner pages, whose sections live in front matter.
- `static/css/style.css` contains the plain-CSS stylesheet, ordered tokens → base → layout →
  components → responsive → reduced motion.
- `static/js/` contains the hero grid animation, the scroll reveal
  the "From agents to software" convergence scene, the 36-plant contour map and the
  "On your hardware" isometric scene, all loaded from `base.html`.
- `static/fonts/` contains the self-hosted Geist variable font.
- `static/images/` and `static/brand/` contain Logven's existing visual assets.
