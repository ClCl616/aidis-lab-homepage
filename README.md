# AIDIS Lab Homepage

A lightweight, community-oriented homepage for AIDIS Lab. It is designed to document lab members by cohort, highlight individual projects and activities, and keep alumni connected through a shared home on the web.

## Goals

- Introduce current and former members, organized by entry year/cohort.
- Give every member a concise profile, project/activity summary, and portfolio link.
- Preserve the lab's history while making alumni participation easy.
- Keep maintenance simple: plain static files, no database or backend required to start.

## Information architecture

```
Home
├── About the lab
├── Members by cohort
│   ├── Current members
│   └── Alumni
├── Projects & activities
└── Community / contact
```

The initial site keeps these sections together on one page. As content grows, cohorts and projects can be split into individual pages while retaining the same navigation.

## Local preview

Open `index.html` directly in a browser, or serve the folder with a local static server. No install or build step is required.

## Updating content

- Edit member cards in `index.html` and replace the sample profiles.
- Add project or activity cards in the Projects section.
- Replace `hello@aidis-lab.example` and the social links with the lab's real contact channels.
- Place photos and other static assets under `assets/` when they are added.

## Deployment direction

GitHub Pages is the recommended first deployment: publish this repository from the `main` branch (root folder) under **Settings → Pages**. A custom domain can be connected later. If the site needs a CMS, authentication, or member submissions in the future, it can move to a hosted static-site platform without discarding the current content structure.

## Repository conventions

- Keep member information public only with each person's approval.
- Prefer small, focused pull requests for content updates.
- Do not commit access tokens, private contact information, or unpublished research material.
