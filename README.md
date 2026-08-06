# PR Tracker

A personal tracker for Jacob's pull requests. Add a markdown file, push to GitHub, and the site rebuilds automatically — each PR becomes a card that expands into its own page, with live status pulled from GitHub.

Built with [Astro](https://astro.build) and hosted on [Vercel](https://vercel.com).

## How it works

Every PR is a single markdown file in [`src/content/prs/`](./src/content/prs/).

1. Copy the template below into a new `.md` file (e.g. `src/content/prs/my-pr.md`).
2. Fill in the frontmatter — date, time, the site it was applied to, the PR link and the repo link.
3. Add a short description of the change as the file body.
4. Push to `main`. Vercel rebuilds and the new PR appears on the site.

At build time the site queries the GitHub API for anything it can find from the links — PR status
(Open / Merged / Closed), merge date, author, and repo details like stars and language. If GitHub is
unreachable or the links don't resolve, the site gracefully falls back to the frontmatter. Set a
`GH_TOKEN` (or `GITHUB_TOKEN`) environment variable to raise the GitHub API rate limit.

The navbar is not duplicated here — `npm run build` downloads
[`Navbar.astro` from the Personal-Website repo](https://github.com/SmartSparkCoding/Personal-Website/blob/main/src/components/Navbar.astro)
into `src/components/generated/` (gitignored) and uses that file directly, so it stays in sync with
the main site. Relative links are made absolute for the `pr.` subdomain and the self-linking
"PR Tracker" item is dropped. If the fetch fails, a committed fallback navbar is used.

## Frontmatter

| Field         | Type                | Required | Notes                                                          |
| ------------- | ------------------- | -------- | -------------------------------------------------------------- |
| `title`       | `string`            | ✓        | PR title                                                       |
| `description` | `string`            | ✓        | Shown on the card                                              |
| `date`        | `string` (`YYYY-MM-DD`) | ✓    | Used for sorting (newest first)                                |
| `time`        | `string` (`HH:MM`)  |          | Shown alongside the date                                       |
| `site`        | `string`            | ✓        | The site/project the PR was applied to                         |
| `repoLink`    | `string` (URL)      | ✓        | The repository the PR targets                                  |
| `prLink`      | `string` (URL)      | ✓        | The pull request on GitHub                                     |
| `tags`        | `string[]`          |          | Shown as pills on the card                                     |
| `featured`    | `boolean`           |          | Pins the PR to the top of the homepage                         |
| `status`      | `open` / `merged` / `closed` |  | Manual status override, used only when GitHub is unreachable |

## Template

```markdown
---
title: "Short, punchy title"
description: "One or two sentences about what this PR does."
date: "2026-08-06"
time: "10:00"
site: "Name of the site"
repoLink: "https://github.com/Owner/Repo"
prLink: "https://github.com/Owner/Repo/pull/1"
tags:
  - python
  - flask
featured: false
---

Add a short description of the change here. This body is rendered as the detail page.
```

## Local development

```sh
npm install
npm run dev
```

## Deploying

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSmartSparkCoding%2Fpr-tracker)

Connect the repository to Vercel — every push to `main` triggers a rebuild. Optionally add a
`GH_TOKEN` secret to avoid GitHub API rate limits during builds.
