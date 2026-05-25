---
description: Generate social media posts (.social.md) and a cover image (.social.png) from a .article.md
argument-hint: <path/to/file.article.md>
---

# Generate social media assets from an article

You are turning a long-form article into shareable assets for **Twitter (X)**, **Bluesky**, and **LinkedIn**, plus a 1200×644 cover image.

## Input

The user will pass a path to a `.article.md` file as `$ARGUMENTS`. If empty, ask which article to use (suggest the most recently modified `*.article.md` under `docs/`).

Derive the basename by stripping the `.article.md` suffix. All outputs go next to the source file:

- `<basename>.social.md` — the three posts
- `<basename>.social.png` — rendered cover, 1200×644

Do not leave any temporary artefacts behind (no intermediate HTML, no scratch files, no leftover screenshots). Only the two outputs above should remain after the command finishes.

## Step 1 — Read & understand the article

Read the full `.article.md`. Identify:

- **Title** — the H1, trimmed.
- **One-sentence hook** — what the reader gets in one breath. Not a summary; the *promise*.
- **3–5 concrete takeaways** — the specific, non-obvious points (code patterns, gotchas, numbers, names of libraries/tools).
- **Primary link** — usually the repo URL or canonical article URL referenced in the article. If multiple, pick the one the article centres on.
- **Author handle** — check git config for the author; default to `@jerome_etienne` (Twitter), `@jeromeetienne.bsky.social` (Bluesky), `Jerome Etienne` (LinkedIn) unless the article specifies otherwise.

Do not invent facts. Every claim in the posts must trace back to a sentence in the article.

## Step 2 — Write `<basename>.social.md`

Use this exact structure (Markdown, no frontmatter):

```markdown
# Social posts — <Title>

## Twitter / X (max 280 chars)

<post text>

---

## Bluesky (max 300 chars)

<post text>

---

## LinkedIn (800–1500 chars, multi-paragraph)

<post text>
```

### Overall tone

Posts should be **entertaining and engaging** across all three platforms. Aim for a voice that's playful, curious, and a little irreverent — the kind of thing a reader stops scrolling for. Use vivid verbs, surprising framings, and concrete details over generic claims. Wit and personality beat polish. That said, stay honest to the article (no hype, no invented facts) and tune the energy to each platform (sharpest on Twitter/Bluesky, slightly more measured on LinkedIn but never dull).

### Per-platform rules

**Twitter / X** — ≤ 280 characters *including the link and any hashtags*. One punchy hook, one concrete detail, one link. 0–2 hashtags max, only if they're genuinely searched (e.g. `#TypeScript`, `#OpenAI`). No "🚀". No "Excited to share". Lead with the surprising thing, not "I wrote a blog post".

**Bluesky** — ≤ 300 characters. Same energy as Twitter but slightly more room. Bluesky users skew technical and allergic to marketing tone, so be even more direct. Hashtags are optional and uncommon — skip unless one is clearly idiomatic. Plain URL at the end is fine.

**LinkedIn** — 800–1500 characters across 4–7 short paragraphs (1–3 sentences each, blank line between). Open with a concrete observation or counterintuitive claim — not "I'm thrilled to announce". Use a bulleted middle section (with `•` or `-`) for the 3–5 takeaways. Close with the link on its own line. End with 3–5 relevant hashtags on the last line (LinkedIn rewards these mildly).

### Character-count check

After drafting, count characters for the Twitter and Bluesky posts (including links — note that Twitter t.co-shortens URLs to 23 chars but assume the raw URL length for safety). If over the limit, tighten — do not split into a thread.

## Step 3 — Build the cover HTML (in-memory / temp only)

Build a self-contained HTML document with embedded CSS that renders a 1200×644 cover card. This HTML is purely an intermediate input to the renderer in Step 4 — it must NOT be written next to the article. If you need it on disk to feed the renderer, write it under the system temp dir (e.g. `mktemp -t social-cover.XXXXXX.html`) and delete it once the PNG is produced.

Design the layout freely — no template is imposed. The only hard constraints are the canvas size (1200×644) and the content requirements below. Pick typography, colours, spacing, and decorative elements that fit the article's tone.

### Required content

- **Eyebrow / category tag**: 2–4 words capturing the article's category (e.g. `HOW-TO · TYPESCRIPT`, `GUIDE · LOCAL LLMS`). ALL CAPS feel.
- **Title**: the article H1, trimmed to ≤ 70 chars if needed without losing the keyword.
- **Subtitle / hook**: the one-sentence hook from Step 1, ≤ 130 chars.
- **Author**: the author's name (from Step 1).
- **Source**: the bare repo path or domain (no `https://`), e.g. `github.com/jeromeetienne/openai_api_local`.

### Design guidance

**Overall feel** — modern, technical, slightly editorial. Think developer-blog cover or conference talk slide, not marketing banner. Confident and uncluttered; one strong focal point (the title), not a collage.

**Background** — dark by default (deep slate / near-black / midnight blue gradient works well). Light or off-white backgrounds are fine if the article tone calls for it, but avoid pure `#fff` or pure `#000`. A subtle gradient, a soft radial glow, or a single geometric accent shape adds depth — keep decoration to one or two elements max.

**Typography**
- Sans-serif system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`). No web-font fetches — the renderer runs offline.
- Title: ~56–72px, weight 700–800, tight line-height (~1.1). Dominant element, readable at thumbnail size.
- Eyebrow: ~20–24px, semibold, uppercase, wide letter-spacing (~0.1em), tinted with the accent colour.
- Subtitle: ~26–30px, regular or medium, line-height ~1.3, muted vs. title (lower contrast, e.g. slate-300 on dark).
- Footer (author + source): ~20–24px, muted.

**Colour**
- One accent colour, used sparingly (eyebrow, an accent shape, maybe an underline). Suggested starting points: sky `#38bdf8` for general dev, purple `#a78bfa` for AI/ML, emerald `#34d399` for infra/tooling, pink `#f472b6` for design. Deviate if a different hue fits the article better.
- Body text on dark: near-white for the title (`#f8fafc`), slate for subtitle (`#cbd5e1`), dimmer slate for footer (`#94a3b8`). Invert sensibly for light backgrounds.
- Maintain strong contrast — the cover gets scaled down to a tiny thumbnail in feeds.

**Layout**
- Generous padding (~64–80px on each side).
- Title and subtitle stacked at the top or upper-left; footer pinned to the bottom edge with author on the left and source on the right.
- Don't centre everything — left-aligned reads as more editorial and is easier on long titles.

**Restraint**
- No emojis. No logos that aren't in the article. No stock-photo backgrounds.
- Keep the document self-contained: inline all CSS, no external assets, no network requests.
- If in doubt, remove an element rather than adding one.

## Step 4 — Render `<basename>.social.png`

Render the cover HTML to a 1200×644 PNG. Point the renderer at the temp HTML path from Step 3 (referred to below as `$TMP_HTML`). In order of preference:

1. **Chrome / Chromium headless** — if available on the system:
   ```sh
   "$(command -v google-chrome || command -v chromium || command -v chrome || echo /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome)" \
     --headless --disable-gpu --hide-scrollbars \
     --window-size=1200,630 \
     --screenshot="<basename>.social.png" \
     "file://$TMP_HTML"
   ```
2. **fastbrowser** (if the `fastbrowser` skill is installed) — open the file:// URL, set viewport 1200×644, screenshot.
3. **Puppeteer one-liner** via `npx` as a fallback:
   ```sh
   npx --yes puppeteer-cli@latest screenshot "file://$TMP_HTML" \
     --output "<basename>.social.png" --viewport 1200x630
   ```

Verify the file was created and its size is reasonable (> 20 KB; a blank render is usually < 10 KB). If rendering fails, report which tool was tried and stop — do not silently leave a broken PNG.

Once the PNG exists (or the run aborts), delete `$TMP_HTML` so no temporary artefacts remain.

## Step 5 — Report

In your final message to the user, output:

- The three character counts (Twitter, Bluesky, LinkedIn).
- The output paths as clickable markdown links.
- A one-line note if any platform was tight on the limit or if the title was shortened.

Do **not** print the full post bodies back — the user can open the `.social.md`.

## Things to avoid

- Generic LinkedIn-speak: "thrilled", "excited to share", "game-changer", "in today's fast-paced world".
- Hashtag salads (> 5 on LinkedIn, > 2 on Twitter).
- Inventing benchmarks, numbers, or quotes not in the article.
- Emojis in the PNG, and at most one in the posts (LinkedIn) if it earns its place.
- Splitting the Twitter post into a thread — one post only.
