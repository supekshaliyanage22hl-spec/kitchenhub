/*
  Builds the crawlable pages from your live Supabase catalogue:
    catalogue.html  - every category and product as plain HTML (what Google reads)
    sitemap.xml     - lists your public pages
    robots.txt      - points search engines to the sitemap

  Run:  node scripts/build-catalogue.mjs        (Node 18 or newer, no installs needed)
  Site address (needed for the sitemap), first match wins:
    1. SITE_URL environment variable, e.g.  SITE_URL=https://kitchenhubb.lk
    2. a CNAME file in the repo root (GitHub Pages custom domain)
    3. inside GitHub Actions: https://<owner>.github.io/<repo>
*/
import {readFileSync, writeFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG = new Function(readFileSync(join(root, "config.js"), "utf8") + "\nreturn CFG;")();
if (!CFG.SUPABASE_URL) { console.error("config.js has no SUPABASE_URL"); process.exit(1); }

/* ---------- data ---------- */
async function fetchAll(table, query) {
  const h = {apikey: CFG.SUPABASE_KEY, Authorization: "Bearer " + CFG.SUPABASE_KEY, Prefer: "count=exact"};
  let out = [], total = Infinity;
  while (out.length < total) {
    const r = await fetch(`${CFG.SUPABASE_URL}/rest/v1/${table}?${query}&limit=1000&offset=${out.length}`, {headers: h});
    if (!r.ok) throw new Error(`${table}: HTTP ${r.status}`);
    const rows = await r.json(), m = /\/(\d+)$/.exec(r.headers.get("content-range") || "");
    total = m ? +m[1] : (rows.length < 1000 ? out.length + rows.length : Infinity);
    if (!rows.length) break;
    out = out.concat(rows);
  }
  return out;
}
const cats = await fetchAll("categories", "select=*&order=sort,name,id");
const prods = await fetchAll("products", "select=*&order=sort,name,id");
const S = {};
try { (await fetchAll("settings", "select=*&order=key")).forEach(x => S[x.key] = x.value); } catch (e) {}
const v = (k, d) => (S[k] || "").trim() || d || "";

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const th = u => /\/product-images\//.test(u) && !/\/brand\//.test(u) ? u.replace(/\/([^\/]+)$/, "/t/$1") : u;

let site = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
if (!site && existsSync(join(root, "CNAME"))) site = "https://" + readFileSync(join(root, "CNAME"), "utf8").trim();
if (!site && process.env.GITHUB_REPOSITORY) {
  const [o, r] = process.env.GITHUB_REPOSITORY.split("/");
  site = r.toLowerCase() === `${o.toLowerCase()}.github.io` ? `https://${o}.github.io` : `https://${o}.github.io/${r}`;
}
const abs = p => site ? `${site}/${p}` : p;

const company = v("company", CFG.COMPANY), accent = /^#[0-9a-f]{6}$/i.test(v("accent")) ? v("accent") : "#FDB515";
const wa = v("whatsapp", CFG.WHATSAPP).replace(/\D/g, "");
const phone = v("phone"), address = v("address"), hours = v("hours");
const logo = v("logo", "logo.png");
const catName = id => (cats.find(c => c.id === id) || {name: "More equipment"}).name;
const catId = p => cats.some(c => c.id === p.category_id) ? p.category_id : "_";
const groups = cats.concat(prods.some(p => catId(p) === "_") ? [{id: "_", name: "More equipment"}] : [])
  .map(c => ({c, it: prods.filter(p => catId(p) === c.id)})).filter(g => g.it.length);

/* ---------- page ---------- */
const title = `Full product list | ${company}`;
const desc = `All ${prods.length} commercial kitchen equipment products from ${company}: ${groups.slice(0, 6).map(g => g.c.name).join(", ")} and more, for hotels, restaurants and bakeries in Sri Lanka.`;

const product = p => {
  const sp = (p.specs || []).map(x => `<li>${x.l ? `<b>${esc(x.l)}:</b> ` : ""}${esc(x.v)}</li>`).join("");
  const price = p.price && !/on request/i.test(p.price) ? `<p class="pr">${esc(p.price)}</p>` : "";
  const img = p.images && p.images[0] ? `<img loading="lazy" src="${esc(th(p.images[0]))}" onerror="this.onerror=null;this.src='${esc(p.images[0])}'" alt="${esc(p.name)}">` : "";
  const msg = encodeURIComponent(`Hi, I'd like to enquire about: ${p.name}${p.model ? " (" + p.model + ")" : ""}`);
  return `<article id="p-${esc(p.id)}"><div class="im">${img}</div><div class="tx"><h3>${esc(p.name)}</h3>${p.model ? `<p class="md">Model: ${esc(p.model)}</p>` : ""}${p.description ? `<p>${esc(p.description)}</p>` : ""}${sp ? `<ul>${sp}</ul>` : ""}${price}<p class="ac"><a href="index.html#product=${encodeURIComponent(p.id)}">View in catalogue</a>${wa ? ` <a href="https://wa.me/${wa}?text=${msg}" rel="noopener">Enquire on WhatsApp</a>` : ""}</p></div></article>`;
};

const ld = site ? `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: abs("catalogue.html"),
  mainEntity: {"@type": "ItemList", numberOfItems: prods.length,
    itemListElement: prods.map((p, i) => ({"@type": "ListItem", position: i + 1, name: p.name + (p.model ? " (" + p.model + ")" : ""), url: abs("catalogue.html") + "#p-" + p.id}))}
}).replace(/</g, "\\u003c")}</script>\n` : "";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${site ? `<link rel="canonical" href="${esc(abs("catalogue.html"))}">\n` : ""}<meta name="theme-color" content="#0F0F10">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
${site ? `<meta property="og:url" content="${esc(abs("catalogue.html"))}"><meta property="og:image" content="${esc(abs(logo))}">\n` : ""}<link rel="icon" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
${ld}<style>
:root{--a:${accent};--ink:#E9ECEE;--mut:#AEB6BC;--bg:#0B0B0C;--card:#151517;--line:#2C2C30}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 Barlow,system-ui,sans-serif}
a{color:var(--a)}a:focus-visible{outline:3px solid var(--a);outline-offset:2px}
h1,h2,h3{font-family:"Barlow Condensed",Impact,sans-serif;line-height:1.1;margin:0}
header{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;padding:12px 20px;border-bottom:2px solid var(--a);background:#0A0A0B}
header img{height:44px;width:auto;display:block}header nav{margin-left:auto;display:flex;gap:18px}header nav a{color:#fff;text-decoration:none}
main{max-width:1100px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:clamp(34px,5vw,52px)}.lead{color:var(--mut);max-width:62ch}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 8px;padding:0;list-style:none}
.jump a{display:inline-block;padding:6px 14px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:#fff}
.jump a:hover{border-color:var(--a)}
h2{font-size:34px;margin:40px 0 14px;padding-bottom:8px;border-bottom:3px solid var(--a);scroll-margin-top:12px}
article{display:grid;grid-template-columns:150px 1fr;gap:16px;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:14px;margin:0 0 12px;scroll-margin-top:12px}
article:target{border-color:var(--a)}
.im{background:#fff;border-radius:4px;aspect-ratio:4/3;overflow:hidden}.im img{width:100%;height:100%;object-fit:contain;display:block}
h3{font-size:24px}.tx p{margin:4px 0}.md{color:var(--mut);font-size:14px}.pr{font-weight:600}
.tx ul{margin:6px 0;padding-left:18px;color:var(--mut);font-size:14px}.tx ul b{color:var(--ink);font-weight:500}
.ac{margin-top:10px!important;display:flex;flex-wrap:wrap;gap:8px 18px}
footer{max-width:1100px;margin:0 auto;padding:18px 16px 40px;border-top:1px solid var(--line);color:var(--mut);display:flex;flex-wrap:wrap;gap:6px 26px;font-size:14px}
@media(max-width:560px){article{grid-template-columns:1fr}.im{max-height:200px}}
</style>
</head>
<body>
<header><a href="index.html"><img src="${esc(logo)}" alt="${esc(company)}"></a><nav><a href="index.html">Interactive catalogue</a><a href="company.html">About us</a></nav></header>
<main>
<h1>Commercial kitchen equipment: full product list</h1>
<p class="lead">${esc(company)} supplies kitchen equipment, bakery tools and hotel supplies. Browse every product below, or open the <a href="index.html">interactive catalogue</a>. Ask us for prices and availability.</p>
<ul class="jump" aria-label="Categories">${groups.map(g => `<li><a href="#c-${esc(g.c.id)}">${esc(g.c.name)} (${g.it.length})</a></li>`).join("")}</ul>
${groups.map(g => `<section><h2 id="c-${esc(g.c.id)}">${esc(g.c.name)}</h2>\n${g.it.map(product).join("\n")}</section>`).join("\n")}
</main>
<footer>${[phone && `Call: <a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a>`, wa && `WhatsApp: <a href="https://wa.me/${wa}" rel="noopener">+${wa}</a>`, address && esc(address), hours && esc(hours)].filter(Boolean).map(x => `<span>${x}</span>`).join("")}</footer>
</body>
</html>
`;
writeFileSync(join(root, "catalogue.html"), html);
console.log(`catalogue.html: ${prods.length} products in ${groups.length} categories`);

/* ---------- sitemap + robots ---------- */
if (site) {
  const pages = ["", "company.html", "catalogue.html"];
  writeFileSync(join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${esc(abs(p))}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFileSync(join(root, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${abs("sitemap.xml")}\n`);
  console.log(`sitemap.xml and robots.txt written for ${site}`);
} else console.warn("No site address found: skipped sitemap.xml and robots.txt (set SITE_URL).");

for (const f of ["index.html", "company.html"])
  if (readFileSync(join(root, f), "utf8").includes("YOUR-DOMAIN")) console.warn(`Reminder: replace YOUR-DOMAIN in ${f} with your real address.`);
