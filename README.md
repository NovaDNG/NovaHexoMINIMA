<details>
    <summary>Original README</summary>

# Minima
An undoubtedly simple and lightweight dark/light mode theme for Hexo.

![Minima preview, device image by Freepik](https://adisaktijrs.github.io/2020/10/11/Hexo-Minima-Theme-v1-0-Officially-Released/minima.jpg)

- See the demo [here](https://adisaktijrs.github.io/minima)
- See the quick start instruction and documentation [here](https://adisaktijrs.github.io/2020/10/11/Hexo-Minima-Theme-v1-0-Officially-Released/)

## About Minima
Minima is an undoubtedly simple and lightweight dark/light mode theme for Hexo. I created this from scratch using [Skeleton CSS](http://getskeleton.com/) boilerplate. It only uses CSS and Vanilla JS, without using unnecessary third-party 'render-blocking' libraries.

### Simplicity
Simplicity is a must! When I decided to move to Hexo for my personal blogging platform, the main reason was to find a simple and clean design, no fancy looks, unnecessary images and colors either. I'd like to have a blog that focuses on the content of my posts rather than turning readers attention to a 'cluttered' user interface. I found lots of beautiful themes on the Hexo themes page, but finally I decided to make my own.

### Lightweight
This 'lightweight' means the theme uses as few design stuff as possible. Fewer JavaScript and CSS files. Minima only uses Skeleton for the CSS-boilerplate and [nanobar.js](https://nanobar.jacoborus.codes/) for the top loading bar. The following is the 'gross' performance of my blog with the Minima theme:

![](https://adisaktijrs.github.io/2020/10/11/Hexo-Minima-Theme-v1-0-Officially-Released/Screenshot.png)

### Customization
Minima uses vanilla JavaScript, vanilla CSS, and [EJS](https://ejs.co/). So it will be very easy for everyone to edit and customize the theme.

## Features
- Pass the core of [Hexo Theme Unit Test](https://github.com/hexojs/hexo-theme-unit-test)
- Fully responsive design
- Support post, page, tags, archives, and pagination
- SEO: post meta description and images (appears in Facebook/Twitter shared-link)
- [Customizable] icon Dark/light mode instant switch 🌑/☀️
- [Customizable] theme color
- Code highlighting with [Prism.js](https://prismjs.com/)
- [Disqus](https://disqus.com/) for post comments
- Show comments section button for faster posts loading

## Documentation
See the quick start instruction and [documentation here](https://adisaktijrs.github.io/2020/10/11/Hexo-Minima-Theme-v1-0-Officially-Released/#Documentation)

## Development
Everyone is welcome to contribute! Go ahead, fork and make pull request 😁

## Credit
Big thanks to [@pduchnovsky](https://github.com/pduchnovsky) and [yukimuon](https://github.com/yukimuon) to help me making this theme even better!

## Licence
Minima is released under [MIT License](https://github.com/adisaktijrs/hexo-theme-minima/blob/master/LICENSE). Copyright © 2020 Adi Sakti Jrs

</details>


---

## NovaDNG Fork — Changelog

This fork diverges substantially from the upstream theme. Changes are documented here relative to [adisaktijrs/hexo-theme-minima](https://github.com/adisaktijrs/hexo-theme-minima) at the `master` branch.

### New Partials

| File                                          | Purpose                                                                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout/partial/pheader.ejs`                  | Alternate header used on post/page layouts; includes the site logo (light/dark `.avif` variants) and a condensed nav.                                                                          |
| `layout/partial/_nav-menu.ejs`                | Extracted nav-link list, shared by `header.ejs` and `pheader.ejs`.                                                                                                                             |
| `layout/partial/theme_init.ejs`               | Centralised dark/light mode bootstrap script (see Dark Mode section).                                                                                                                          |
| `layout/partial/path_breadcrumb.ejs`          | Breadcrumb trail built from the page's URL path, resolving titles from site data.                                                                                                              |
| `layout/partial/tategaki_content.ejs`         | Wrapper that renders post/page content inside a `.tategaki-stage` container for vertical-rl layout.                                                                                            |
| `layout/partial/tategaki_script.ejs`          | ~430-line vanilla-JS module: wheel→horizontal-scroll mapping, ruby annotation spacing, dynamic column-height calculation, `<details>` animation with scroll preservation, font-load detection. |
| `layout/partial/yoishigure_float_nav.ejs`     | Fixed sidebar (desktop) / bottom-sheet (mobile) navigation for the Yoishigure index page. Extracts headings from live DOM, supports in-page search with match highlighting.                    |
| `layout/partial/yoishigure_embed_preview.ejs` | Modal dialog that intercepts links to `/Works/Yoishigure/` and renders the target page in a theme-synced `<iframe>` without leaving the index.                                                 |

### New CSS Files

| File                  | Purpose                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `source/css/font.css` | `@font-face` declarations for self-hosted fonts (see Fonts section).                                                                 |
| `source/css/typo.css` | Fine-grained typography rules: per-element font families (serif, monospace), `.lit` utility class, `.post-meta` and `.owner` styles. |

### New JS Files

| File                    | Purpose              |
| ----------------------- | -------------------- |
| `source/js/fancybox.js` | Image lightbox/zoom. |

### New Fonts (self-hosted)

The fork drops the original two bundled font families (DM Serif Display, Inter) and replaces them with a larger, self-hosted stack:

- **Berkeley Mono** (Regular, Bold) — monospace
- **Inter** — sans-serif (retained)
- **DM Serif Display** — display serif (retained)
- **Redaction** (Regular, Bold, Italic) — display
- **iA Writer Quattro V** — variable proportional
- **EB Garamond** (variable) — body serif

Additionally, Adobe Typekit is loaded at runtime for supplementary CJK/display faces.

### Modified: Dark Mode (`header.ejs`, `pheader.ejs`, `theme_init.ejs`)

**Original behaviour:** A small inline `<script>` inside `header.ejs` toggled `body.darkmode` and read only a `'dark'` value from `localStorage`. No system-preference detection. No persistent light-mode preference.

**Fork behaviour:**
- All theme-init logic extracted into `theme_init.ejs`, injected once from `layout.ejs`.
- `darkmode` class is applied to **both** `<html>` and `<body>` (prevents flash on stylesheet load).
- `localStorage` stores either `'dark'` or `'light'`; removing the key returns to system preference.
- System preference (`prefers-color-scheme`) is followed live when no explicit preference is stored, using both `addEventListener` and the legacy `addListener` for Safari compatibility.
- Multiple toggle buttons are supported via `data-theme-role="dark"` / `data-theme-role="light"` attributes, in addition to the legacy `#darkBtn` / `#lightBtn` IDs.

### Modified: Comments — Disqus → Giscus (`giscus.ejs`)

The original `comments.ejs` loaded Disqus lazily behind a button. This fork replaces it with Giscus (GitHub Discussions):

- `giscus.ejs` loads the Giscus client script lazily and configures it from `_config.yml` (`theme.giscus.*`).
- Theme is kept in sync: switches between `catppuccin_latte` (light) and `transparent_dark` (dark) by posting `setConfig` messages to the Giscus iframe.
- Syncs on: initial load, `body.darkmode` class mutations (MutationObserver), and system theme changes.

### Modified: Layouts

**`layout/layout.ejs`**
- Injects `theme_init.ejs` in `<head>` (before CSS) to prevent dark-mode flash.
- Adds Adobe Typekit `<link>` for CJK/display fonts.
- Loads `font.css` and `typo.css` in the CSS cascade (before `custom.css`).
- Conditionally injects a `<style>` block with critical Yoishigure index styles when `page.yoishigure_index` is set.
- Simplified OG/Twitter image tags (removed null-guards, always emits the tag).
- `<html lang>` hardcoded to `"en"` (original used `config.language`).

**`layout/post.ejs`**
- Renders content through `tategaki_content.ejs` instead of a bare `<%- page.content %>`.
- Comments delegated to `giscus.ejs` instead of `comments.ejs`.

**`layout/page.ejs`**
- Uses `pheader.ejs` instead of `header.ejs`.
- Adds `path_breadcrumb.ejs` above the page title.
- Renders content through `tategaki_content.ejs`.
- Adds Giscus comments block.

### Modified: Footer (`footer.ejs`)

Social icon set changed:

| Removed        | Added    |
| -------------- | -------- |
| LinkedIn       | Bluesky  |
| Stack Overflow | Telegram |

GitHub, Twitter/X, and Instagram are retained.
