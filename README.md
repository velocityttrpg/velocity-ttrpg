# Velocity TTRPG

A cinema-first tabletop roleplaying game built for emotionally intense, relationship-driven stories. Combat is a punctuation mark, not the core loop. The rules stay out of the way so the story can move.

**Live site:** [velocityttrpg.github.io/velocity-ttrpg](https://velocityttrpg.github.io/velocity-ttrpg)

---

## What's in this repository

```
Core Rules/       — The complete Velocity Core Rules in Markdown
Glossary/         — System-wide glossary
Licensing/        — OGL and product identity documents
Website/          — Static site builder and hand-maintained pages
  build.js        — Converts Markdown source to HTML reader pages
  style.css       — Site stylesheet
  search.js       — Client-side full-text search
  Site/           — About and Playtesting pages (Markdown source)
  *.html          — Hand-maintained pages (index, legal, character sheet)
.github/
  workflows/
    deploy.yml    — Builds and deploys to GitHub Pages on push
```

The `Website/reader/` directory and search index files are build artifacts — they are not committed to the repository and are generated fresh on every deploy.

---

## Building locally

Node.js is the only dependency (no npm packages required).

```bash
cd Website
node build.js
```

Output is written to `Website/reader/` and `Website/search-index.*`. Open any `.html` file in `Website/` to browse locally.

---

## Deployment

Pushing to `main` automatically triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages. No manual build step needed.

The workflow fires when `.md` source files, the build script, the stylesheet, or hand-maintained site pages change.

---

## Feedback and issues

This repository does not accept pull requests — the Core Rules are authored and maintained by the Velocity design team. If you spot an error, have a question, or want to propose a change, please use the **⚑ Report Issue** button on any page of the live site, or file an issue directly in the [Issues tab](https://github.com/velocityttrpg/velocity-ttrpg/issues).

---

## License

The Velocity Core Rules are published under the Velocity Open License (VOL). See the [Licensing](Licensing/) folder for the full license text, plain-English summary, creator FAQ, and commercial licensing information.
