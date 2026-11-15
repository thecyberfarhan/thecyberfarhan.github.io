# sync-writeups.mjs

Pulls every writeup from [CTF-Writeups](https://github.com/thecyberfarhan/CTF-Writeups) (the `TryHackme/` and `HackTheBox/` folders), parses the template they're written in, and writes `src/data/writeups.json`. Astro builds every writeup page, the writeup count, the home-page ledger, the sitemap and `llms.txt` from that one file, so nothing on the site is patched by find-and-replace.

- Every writeup gets a page, all difficulties included.
- Nothing is append-only: a writeup renamed or deleted upstream disappears on the next build.
- The file is only rewritten when a writeup actually changed, so CI does not commit noise.

Run it locally:

```bash
npm run sync
GITHUB_TOKEN=$(gh auth token) npm run sync   # higher GitHub API rate limit
```

## Automation

`.github/workflows/site.yml` runs the sync, commits the JSON if it changed, builds and deploys. It runs on every push to `main`, every 3 hours, on manual dispatch, and on a `repository_dispatch` event of type `writeups-updated`.

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

Without this, the 3-hour scheduled run still covers it -- this step is purely for "instant" instead of "within a few hours."

## Template assumptions

The parser handles both templates used so far: the older one (`**Difficulty:**` line, bullet list under "Tools Used", headings like "Shell / Access") and the newer one (difficulty in the ASCII banner, a `| Tool | Purpose |` table, "Shell / Initial Access", "Escalation Path", dates in the Changelog table). Section headings are matched by aliases in `SECTION_ORDER`; a writeup with a heading it does not know simply leaves that section out rather than failing the build.
