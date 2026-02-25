import os
import json
import shutil
from datetime import date

SRC_DIR = "src"
DIST_DIR = "dist"
CONTENT_DIR = "content"
PARTIALS_DIR = os.path.join(SRC_DIR, "partials")
TEMPLATES_DIR = os.path.join(SRC_DIR, "templates")
ASSETS_DIR = os.path.join(SRC_DIR, "assets")

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path: str, content: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def strip_slashes(slug: str) -> str:
    # "/tdee-calculator/" -> "tdee-calculator"
    return slug.strip("/")

def render_template(template_html: str, tokens: dict) -> str:
    out = template_html
    for k, v in tokens.items():
        out = out.replace("{{" + k + "}}", v if v is not None else "")
    return out

def load_partials():
    # these are "locked theme"
    head = read_file(os.path.join(PARTIALS_DIR, "head.html"))
    header = read_file(os.path.join(PARTIALS_DIR, "header.html"))
    footer = read_file(os.path.join(PARTIALS_DIR, "footer.html"))
    return head, header, footer

def build():
    site = load_json(os.path.join(CONTENT_DIR, "site.json"))
    tools = load_json(os.path.join(CONTENT_DIR, "tools.json"))
    pillars = load_json(os.path.join(CONTENT_DIR, "pillars.json"))
    guides = load_json(os.path.join(CONTENT_DIR, "guides.json"))

    domain = site["site"]["domain"].rstrip("/")
    title_suffix = site.get("seo", {}).get("title_suffix", " | intake.fitness")

    # clean dist
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR, exist_ok=True)

    # copy assets
    shutil.copytree(ASSETS_DIR, os.path.join(DIST_DIR, "assets"))

    head_html, header_html, footer_html = load_partials()

    # templates
    tool_tpl = read_file(os.path.join(TEMPLATES_DIR, "tool.html"))
    list_tpl = read_file(os.path.join(TEMPLATES_DIR, "list.html"))

    # --------------- home ---------------
    home_html = render_template(
        list_tpl,
        {
            "HEAD": head_html,
            "HEADER": header_html,
            "FOOTER": footer_html,
            "TITLE": "intake.fitness — shareable calculators" + title_suffix,
            "DESCRIPTION": "Accurate calorie and body calculators with shareable results.",
            "CANONICAL": f"{domain}/",
            "H1": "intake.fitness",
            "LEAD": "Clean calculators with shareable results (link + PNG). US-first units, metric supported.",
            "LIST_TITLE": "Top calculators",
            "LIST_ITEMS": "\n".join(
                [
                    f'<li><a href="{t["slug"]}">{t["name"]}</a><span class="muted"> — {t["seo"]["description"]}</span></li>'
                    for t in tools[:8]
                ]
            ),
        },
    )
    write_file(os.path.join(DIST_DIR, "index.html"), home_html)

    # --------------- calculators index ---------------
    calc_items = "\n".join(
        [
            f'<li><a href="{t["slug"]}">{t["name"]}</a><span class="muted"> — {t["seo"]["description"]}</span></li>'
            for t in tools
        ]
    )
    calculators_html = render_template(
        list_tpl,
        {
            "HEAD": head_html,
            "HEADER": header_html,
            "FOOTER": footer_html,
            "TITLE": "Calculators" + title_suffix,
            "DESCRIPTION": "All intake.fitness calculators with shareable results.",
            "CANONICAL": f"{domain}/calculators/",
            "H1": "Calculators",
            "LEAD": "Pick a calculator. Every tool gives a shareable result card + link.",
            "LIST_TITLE": "All calculators",
            "LIST_ITEMS": calc_items if calc_items else "<li>No calculators yet.</li>",
        },
    )
    write_file(os.path.join(DIST_DIR, "calculators", "index.html"), calculators_html)

    # --------------- tool pages ---------------
    for t in tools:
        slug_path = strip_slashes(t["slug"])  # e.g. "tdee-calculator"
        canonical = f'{domain}{t["slug"]}'

        # Build related links block (deterministic internal linking)
        related_html = ""
        rel = t.get("related", {})
        if rel:
            def link_list(label, ids, items, key="id"):
                if not ids:
                    return ""
                li = []
                for rid in ids:
                    found = next((x for x in items if x[key] == rid), None)
                    if found:
                        li.append(f'<li><a href="{found["slug"]}">{found["name"]}</a></li>')
                if not li:
                    return ""
                return f"""
                <div class="mini-card">
                  <div class="mini-title">{label}</div>
                  <ul class="mini-list">
                    {''.join(li)}
                  </ul>
                </div>
                """

            related_html = f"""
            <section class="grid-3">
              {link_list("Related tools", rel.get("tools", []), tools)}
              {link_list("Key hubs", rel.get("pillars", []), pillars)}
              {link_list("Guides", rel.get("guides", []), guides)}
            </section>
            """

        # FAQ
        faq_html = ""
        if t.get("faq"):
            faq_items = "\n".join(
                [f'<details class="faq"><summary>{x["q"]}</summary><div class="faq-a">{x["a"]}</div></details>' for x in t["faq"]]
            )
            faq_html = f"""
            <section class="card">
              <h2>FAQ</h2>
              {faq_items}
            </section>
            """

        content = f"""
        <header class="page-head">
          <div class="kicker">Calculator</div>
          <h1>{t["name"]}</h1>
          <p class="lead">{t["ui"]["hero_lead"]}</p>
        </header>

        <section class="card">
          <div class="tool-top">
            <div class="tool-title">
              <h2>Enter your details</h2>
              <p class="muted">US units by default. Switch to metric anytime.</p>
            </div>
            <div class="unit-toggle" role="group" aria-label="Units toggle">
              <button class="chip is-active" data-units="us" type="button">US</button>
              <button class="chip" data-units="metric" type="button">Metric</button>
            </div>
          </div>

          <form id="{t["id"]}-form" class="tool-form" novalidate>
            <!-- Tool-specific fields rendered by JS -->
            <div id="{t["id"]}-fields"></div>

            <div class="tool-actions">
              <button class="btn" type="submit">Calculate</button>
              <button class="btn btn-ghost" type="button" id="{t["id"]}-reset">Reset</button>
            </div>

            <p class="tiny muted">Tip: share your result card (PNG) to save and compare later.</p>
          </form>
        </section>

        <section class="card" id="{t["id"]}-results" hidden>
          <div class="result-head">
            <h2>Your results</h2>
            <div class="share-row">
              <button class="btn btn-ghost" type="button" id="{t["id"]}-copy-link">Copy link</button>
              <button class="btn btn-ghost" type="button" id="{t["id"]}-copy-summary">Copy summary</button>
              <button class="btn" type="button" id="{t["id"]}-download-png">Download PNG</button>
            </div>
          </div>

          <div class="result-grid">
            <div class="result-card" id="{t["id"]}-card">
              <div class="result-brand">intake.fitness</div>
              <div class="result-title">{t["ui"]["result_card"]["headline_label"]}</div>
              <div class="result-big" id="{t["id"]}-big">—</div>
              <div class="result-sub" id="{t["id"]}-sub">kcal/day</div>

              <div class="result-badges" id="{t["id"]}-badges"></div>

              <div class="result-kv" id="{t["id"]}-kv"></div>

              <div class="result-foot">
                <span class="muted" id="{t["id"]}-footnote">Estimate. Adjust using weekly trends.</span>
              </div>
            </div>

            <div class="result-explain">
              <h3>What to do with this</h3>
              <ul class="clean-list" id="{t["id"]}-next-steps">
                <li>Use this as your starting maintenance.</li>
                <li>Track 2–3 weeks, adjust by 100–200 kcal as needed.</li>
                <li>Share your card so you can compare later.</li>
              </ul>

              <div class="mini-note">
                <strong>Practical rule:</strong> calories are a plan, not a promise. Your trend beats the estimate.
              </div>
            </div>
          </div>
        </section>

        {related_html}

        {faq_html}

        <section class="card">
          <h2>How we calculate it</h2>
          <p class="muted">
            This calculator uses a standard BMR equation + an activity multiplier. We keep the math transparent inside the tool.
          </p>
        </section>
        """

        page_html = render_template(
            tool_tpl,
            {
                "HEAD": head_html + f'\n<script defer src="{t["script"]}"></script>',
                "HEADER": header_html,
                "FOOTER": footer_html,
                "TITLE": t["seo"]["title"] + title_suffix,
                "DESCRIPTION": t["seo"]["description"],
                "CANONICAL": canonical,
                "H1": t["name"],
                "CONTENT": content,
            },
        )

        write_file(os.path.join(DIST_DIR, slug_path, "index.html"), page_html)

    # --------------- minimal sitemap ---------------
    urls = [f"{domain}/", f"{domain}/calculators/"] + [f"{domain}{t['slug']}" for t in tools]
    lastmod = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append("  <url>")
        sm.append(f"    <loc>{u}</loc>")
        sm.append(f"    <lastmod>{lastmod}</lastmod>")
        sm.append("    <changefreq>weekly</changefreq>")
        sm.append("    <priority>0.7</priority>")
        sm.append("  </url>")
    sm.append("</urlset>")
    write_file(os.path.join(DIST_DIR, "sitemap.xml"), "\n".join(sm))

    print("Build complete → dist/")

if __name__ == "__main__":
    build()
