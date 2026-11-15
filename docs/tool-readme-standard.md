# Tool README standard

Every project under `github.com/thecyberfarhan` (original tools, forks and field notes) uses
the same README structure. It does two jobs:

1. **On GitHub** it gives a visitor the same answers in the same order every time: what it is,
   what it needs, how to install it, how to use it, how it compares, how it was tested.
2. **On the site** the projects sync reads it and builds `/projects/<name>.html` from it, the
   same way the writeups sync builds writeup pages. Nothing about a project is typed into the
   site by hand: write the README, tag the repo, push.

If a README follows this page, it appears on the site on the next sync (every 3 hours, or at
once with a manual run). If it doesn't, `npm run lint:readmes` names what's missing.

## How a repo gets onto the site

Add the GitHub topic **`portfolio-project`** to the repo. That's the whole opt-in. The sync
finds every public repo with that topic, reads its README, and builds the page. Remove the topic
and it leaves the site.

Private projects are not synced. They can be listed by hand in `src/data/site.ts` and show as a
card with no page.

## What belongs on the site

The site is a hiring portfolio, so every project it shows should read as offensive-security work
with a clear purpose, not as a pile of experiments. Before adding the `portfolio-project` topic
to a repo, check it passes these:

1. It relates to the work: web and API testing, recon, exploitation, reporting, or the wider
   offensive-security field. A tool that doesn't should stay off the site, however good it is.
2. There is real work in it: a bug reproduced and fixed, a feature added with a test, a written
   report with evidence. A bare fork with no changes doesn't qualify.
3. `## What this shows` can be filled in honestly.

## The three kinds

| Kind | What it is | Examples |
| --- | --- | --- |
| **Original** | A tool I wrote | reconkit, apicheck |
| **Fork** | Someone else's tool, with fixes and features added by me | Sherlock, Corsy, jwt_tool |
| **Field note** | Written work rather than code: reports, research | lab-reports |

The kind is the `Kind` row of the "At a glance" table. It decides which sections are required.

## Structure

Headings must be exactly these (capitalisation doesn't matter). Order matters: the site shows
sections in this order whatever order they are written in.

| # | Heading | Original | Fork | Field note |
| - | --- | --- | --- | --- |
| 0 | `# Name`, then a one-line `> tagline` | required | required | required |
| 1 | `## At a glance` | required | required | required |
| 2 | `## Why` | required | required | required |
| 2b | `## What this shows` | required | required | required |
| 3 | `## Requirements` | required | required | – |
| 4 | `## Install` | required | required | – |
| 5 | `## Usage` | required | required | – |
| 6 | `## Options` | required | required | – |
| 7 | `## Example output` | recommended | recommended | – |
| 8 | `## What it checks` / `## What's inside` | recommended | recommended | required |
| 9 | `## How it works` | optional | optional | `## Method` required |
| 10 | `## Comparison` | recommended | **required** | – |
| 11 | `## What changed` | – | **required** | – |
| 12 | `## Testing` | required | required | – |
| 13 | `## Limitations` | recommended | recommended | recommended |
| 14 | `## Responsible use` | required for security tools | required | required |
| 15 | `## Credits` | – | **required** | – |
| 16 | `## License` | required | required | required |

Field notes also use `## Scope`, `## Method` and `## Findings` in place of 3 to 6.

### What each section holds

**`# Name` and the tagline.** The name as it should be displayed. Straight under it, one
sentence in a `>` blockquote, 140 characters or fewer, saying what the tool does. This is what
shows on the project card.

**`## At a glance`.** A two-column table. Keys, exactly:

| Key | Value |
| --- | --- |
| `Kind` | `Original`, `Fork` or `Field note` |
| `Status` | `Active`, `Stable`, `Maintained`, `Experimental` or `Archived` |
| `Language` | Main language (filled from GitHub if left out) |
| `Requires` | The one-line requirement, e.g. `Python 3.10+` |
| `License` | SPDX name (filled from GitHub if left out) |
| `Upstream` | Forks only: `owner/repo` of the original |
| `Scope` | Security tools: `Authorized testing only` |
| `Skill area` | What this shows an employer. One of: `Web and API testing`, `Recon and enumeration`, `Exploitation`, `Reporting`, `Social engineering`, `OSINT`, `Tooling and automation` |

**`## Why`.** Two to four sentences: the problem, and who it's for. No marketing.

**`## What this shows`.** Written for someone deciding whether to interview me. Two to four
bullets naming the offensive-security skills this project demonstrates and the evidence for each
(a reproduced bug, a test that proves it, a merged fix, a report with ratings). Only things that
were done and checked. If a bullet can't point at something concrete in the repo, delete it.

**`## Requirements`.** What must exist before installing: language version, operating systems it
was tried on, Python packages, system packages. A bulleted list.

**`## Install`.** One `###` per platform that was actually tried. Every command is in a code
block, copy-pasteable, and the section ends with a command that proves it worked
(`tool --version`). Use these platform names so the site can label them: `Arch Linux`,
`Kali Linux, Parrot OS`, `macOS`, `Windows`, `Docker`.

**`## Usage`.** One `###` per task ("Scan a list of URLs", "Route through Burp"). Each has the
command in a code block and one line saying what it does. Start with the simplest command.

**`## Options`.** A table: `Flag | What it does | Default`. Every flag the tool accepts.

**`## Example output`.** Real output, trimmed to the interesting lines, in a code block. Never
invented output.

**`## What it checks`** (or `## What's inside` for field notes). A table of capabilities or
contents.

**`## How it works`.** Optional: a short explanation for anyone who wants the mechanism.

**`## Comparison`.** A table. Forks: this fork against upstream, one row per difference, first
column the feature. Originals: this tool against the alternatives a reader would reach for, with
an honest "use that instead when…" row. Every cell must be something that was checked.

**`## What changed`.** Forks only. One `###` per change, each with the problem, the cause, and
the fix, linking the upstream issue or pull request when there is one. Say what was reproduced
and how it was verified.

**`## Testing`.** The command to run the tests, what they cover, and where CI runs. If there are
no automated tests, say so and say how it was verified instead.

**`## Limitations`.** The honest list of what it doesn't do or won't catch.

**`## Responsible use`.** Who may use it against what. For security tools: only systems you own
or have written permission to test.

**`## Credits`.** Forks only: the upstream authors and project, with links.

**`## License`.** The license, with a link to the file.

## Writing rules

- Commands in code blocks, always. Never inline a multi-word command in prose.
- Install steps are for the platforms that were tried. Don't list one that wasn't.
- Numbers and claims (test counts, supported versions) come from something that was run.
- Link issues and pull requests by full URL so the links work on the site too.
- Badges are welcome on GitHub. The site drops images and raw HTML, so nothing important may
  live only in a badge or an image.
- One `# H1` per file. Use `##` for the sections above and `###` inside them.

## What the site does with it

| README part | Where it shows on the site |
| --- | --- |
| Name, tagline | Page heading and the project card |
| At a glance | The facts panel beside the page and the card's tags |
| Each section | A section of the page, with a link in "On this page" |
| Code blocks | Syntax-neutral blocks with a copy button |
| Tables | Responsive tables (comparison, options, checks) |
| Install | Also summarised as the first command on the card |
| Relative links and images | Links are pointed at the repo on GitHub; images are dropped |

## Checking a README

```bash
npm run lint:readmes            # every topic-tagged repo
npm run lint:readmes -- corsy   # one repo
```

It prints, per repo, the kind it read, any required section that is missing, and any heading it
didn't recognise (those are kept on the page, after the known sections).
