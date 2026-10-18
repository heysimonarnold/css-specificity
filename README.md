# CSS Specificity

It's a fun quiz to learn and practice CSS Specificity.

Live site:

- GitHub Pages: https://heysimonarnold.github.io/css-specificity/
- Custom domain: https://css-specificity.smnarnold.com

## Dev

Install the project with npm:

```
npm install
```

Start the local dev server:

```
npm run dev
```

## GitHub Pages deployment

This project is configured for a GitHub Pages project site.

1. Push the project to GitHub.
2. In the repository settings, enable GitHub Pages and choose the `GitHub Actions` source.
3. The deploy workflow in `.github/workflows/deploy-pages.yml` will build and publish the site automatically on pushes to `main`.

Local production build:

```
npm run build
```

The generated static site is in the `dist` folder.

## Level Structure

| Key         | Type   | Description                                           |
| ----------- | ------ | ----------------------------------------------------- |
| slug        | String | Used in the URL and for the descriptions translations |
| html        | String | HTML for this level.                                  |
| shuffle     | Bool   | Can the answers order be random? _(true by default)_  |
| answers     | Array  | Array of answers                                      |
| selector    | String | CSS Selector for an answer                            |
| specificity | Number | Specificity of the matching selector                  |
| bg          | String | A forced background-color for this answer             |
| good        | Bool   | Is this answer the right one?                         |

## Languages supported

- English, Français

## Contributors

- [smnarnold](https://github.com/smnarnold)
