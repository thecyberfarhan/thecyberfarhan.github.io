# sync-writeups.mjs

Pulls every writeup from [CTF-Writeups](https://github.com/thecyberfarhan/CTF-Writeups) (the `TryHackme/` and `HackTheBox/` folders), parses the shared template they're all written in, and regenerates everything in `writeups/`.

- **The total count** (both folders, every difficulty) drives the "N writeups" stat on the main site, in the og/meta descriptions, and in `llms.txt`. That's a raw fact, not curated -- it updates every run.
- **The on-site pages** are curated down to Medium/Hard/unrated (anything that isn't explicitly Easy or Very Easy, including HTB's Starting Point track, which is treated the same as Very Easy since it never self-reports a difficulty word). The easy ones stay on GitHub only.
- **Nothing here is append-only.** A writeup renamed or deleted upstream has its page removed here on the next run.

Run it locally:

```bash
node scripts/sync-writeups.mjs
```

A `GITHUB_TOKEN` env var is optional locally (raises the GitHub API rate limit from 60/hr to 5000/hr -- useful if you're iterating and hitting 403s):

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/sync-writeups.mjs
```

## Automation

`.github/workflows/sync-writeups.yml` runs this on a schedule (every 3 hours), on manual dispatch, and on a `repository_dispatch` event -- so a new writeup pushed to CTF-Writeups shows up here automatically within a few hours at most, with zero setup. No PAT or secret needed for this part; the workflow's automatic `GITHUB_TOKEN` is enough to read a public repo.

### Optional: instant sync instead of a 3-hour wait

If you want a push to CTF-Writeups to trigger this site's sync immediately instead of waiting for the next scheduled run, add this workflow to the **CTF-Writeups** repo (not this one):

`.github/workflows/notify-portfolio.yml` in `thecyberfarhan/CTF-Writeups`:

```yaml
name: Notify portfolio
on:
  push:
    branches: [main]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.PORTFOLIO_DISPATCH_TOKEN }}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/thecyberfarhan/thecyberfarhan.github.io/dispatches \
            -d '{"event_type":"writeups-updated"}'
```

That needs a one-time setup step only you can do (creating a token requires GitHub's own UI, not something that can be scripted from here):

1. On GitHub: Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> **New token**.
2. Resource owner: your account. Repository access: **Only select repositories** -> `thecyberfarhan.github.io`.
3. Permissions: Repository permissions -> **Contents: Read and write** (that's what `repository_dispatch` needs).
4. Generate it, then in `CTF-Writeups` -> Settings -> Secrets and variables -> Actions -> **New repository secret** -> name it `PORTFOLIO_DISPATCH_TOKEN`, paste the token.

Without this, the 3-hour scheduled sync still covers it -- this step is purely for "instant" instead of "within a few hours."

## Template assumptions

The parser is defensive but it is written against the specific template every writeup so far has used: a leading `# THM — Name` or `# Name — TryHackMe Writeup` heading (or, failing that, the last line of the ASCII-art banner), a `> **Difficulty:** X` metadata line (or, failing that, a known difficulty word in the banner's last line), and `## Heading` sections named TL;DR, Introduction, Recon, Foothold, Shell / Access, Escalation, Exploitation, Rabbit Holes, Mitigations, Key Takeaway, If I Did It Again. If a future writeup drops this template entirely, its difficulty/title detection may need a new fallback added to `parseWriteup()` -- the script fails loudly (throws) rather than silently publishing a mangled page if it can't find the writeup-count anchors in `index.html`, but a single malformed writeup file currently degrades gracefully (missing pieces just don't render) rather than aborting the whole sync.
