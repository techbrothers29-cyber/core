// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Dynamic: fetches all ETG hotels + NovaXS establishments + companies ativas via Supabase REST.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://bahofertas.com";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://lyypfrtnmhwahixvvjxk.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eXBmcnRubWh3YWhpeHZ2anhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODcxMjUsImV4cCI6MjA5MDQ2MzEyNX0.K--2DRb1SbQl43yS02CeKGHgoVH3ZLQpGUCSxAu-v60";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const SLUG_STOPWORDS = new Set([
  "o","a","os","as","de","da","do","das","dos","e","em","no","na","nos","nas","um","uma","ao","aos",
]);

/** Espelha src/lib/establishment-slug.ts para que o sitemap use as mesmas URLs canônicas. */
function establishmentSlug(name: string): string {
  const all = (name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " e ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const kept = all.filter((w) => !SLUG_STOPWORDS.has(w.toLowerCase()));
  const list = kept.length > 0 ? kept : all;
  return list
    .map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("-");
}

async function fetchTable<T = any>(table: string, query: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${table} fetch ${res.status}`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (e) {
    console.warn(`[sitemap] ${table} fetch failed`, e);
    return [];
  }
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/hospedagem", changefreq: "daily", priority: "0.9" },
  { path: "/restaurantes", changefreq: "daily", priority: "0.8" },
  { path: "/entretenimento", changefreq: "daily", priority: "0.8" },
  { path: "/servicos", changefreq: "weekly", priority: "0.7" },
  { path: "/carros", changefreq: "weekly", priority: "0.7" },

  // Landing pages de cidade (alta intenção SEO)
  { path: "/hoteis-em-gramado", changefreq: "weekly", priority: "0.9" },
  { path: "/hoteis-em-canela", changefreq: "weekly", priority: "0.9" },
  { path: "/hoteis-em-bento-goncalves", changefreq: "weekly", priority: "0.9" },
  { path: "/hoteis-na-serra-gaucha", changefreq: "weekly", priority: "0.9" },
  { path: "/pousadas-em-gramado", changefreq: "weekly", priority: "0.9" },
  { path: "/pousadas-em-canela", changefreq: "weekly", priority: "0.9" },
  { path: "/hoteis-baratos-em-gramado", changefreq: "weekly", priority: "0.85" },
  { path: "/ofertas-em-gramado", changefreq: "weekly", priority: "0.85" },
  { path: "/ofertas-em-canela", changefreq: "weekly", priority: "0.85" },
  { path: "/passeios-em-gramado", changefreq: "weekly", priority: "0.85" },
  { path: "/passeios-em-canela", changefreq: "weekly", priority: "0.85" },
  { path: "/restaurantes-em-gramado", changefreq: "weekly", priority: "0.85" },

  // LPs temáticas — alta intenção de busca
  { path: "/fondue-em-gramado", changefreq: "weekly", priority: "0.85" },
  { path: "/cafe-colonial-em-gramado", changefreq: "weekly", priority: "0.85" },
  { path: "/rodizio-em-gramado", changefreq: "weekly", priority: "0.8" },
  { path: "/ingressos-snowland", changefreq: "weekly", priority: "0.9" },
  { path: "/ingressos-mini-mundo", changefreq: "weekly", priority: "0.9" },
  { path: "/ingressos-dreamland", changefreq: "weekly", priority: "0.85" },
  { path: "/ingressos-gramadozoo", changefreq: "weekly", priority: "0.85" },
  { path: "/ingressos-acquamotion", changefreq: "weekly", priority: "0.85" },
  { path: "/ingressos-alpen-park", changefreq: "weekly", priority: "0.85" },
  { path: "/ingressos-parque-do-caracol", changefreq: "weekly", priority: "0.85" },
  { path: "/natal-luz-gramado", changefreq: "weekly", priority: "0.9" },
  { path: "/hoteis-com-piscina-em-gramado", changefreq: "weekly", priority: "0.8" },
  { path: "/hoteis-pet-friendly-em-gramado", changefreq: "weekly", priority: "0.8" },

  // Cidades novas — Serra Gaúcha expandida
  { path: "/hoteis-em-nova-petropolis", changefreq: "weekly", priority: "0.85" },
  { path: "/hoteis-em-sao-francisco-de-paula", changefreq: "weekly", priority: "0.85" },
  { path: "/hoteis-em-garibaldi", changefreq: "weekly", priority: "0.8" },
  { path: "/hoteis-em-farroupilha", changefreq: "weekly", priority: "0.8" },
  { path: "/passeios-em-nova-petropolis", changefreq: "weekly", priority: "0.8" },
  { path: "/passeios-em-sao-francisco-de-paula", changefreq: "weekly", priority: "0.8" },
  { path: "/passeios-em-bento-goncalves", changefreq: "weekly", priority: "0.85" },
  { path: "/restaurantes-em-canela", changefreq: "weekly", priority: "0.8" },
  { path: "/restaurantes-em-bento-goncalves", changefreq: "weekly", priority: "0.8" },
  { path: "/o-que-fazer-em-gramado", changefreq: "weekly", priority: "0.9" },
  { path: "/o-que-fazer-em-canela", changefreq: "weekly", priority: "0.9" },
  { path: "/o-que-fazer-em-bento-goncalves", changefreq: "weekly", priority: "0.85" },
  { path: "/vinicolas-em-bento-goncalves", changefreq: "weekly", priority: "0.9" },
  { path: "/canion-itaimbezinho", changefreq: "weekly", priority: "0.85" },

  // Páginas institucionais indexáveis
  { path: "/programa-afiliados", changefreq: "monthly", priority: "0.5" },
  { path: "/termos", changefreq: "yearly", priority: "0.3" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
];


async function buildDynamic(): Promise<SitemapEntry[]> {
  const out: SitemapEntry[] = [];

  // ETG hotels — todos os hotéis disponíveis (cache local)
  const hotels = await fetchTable<{
    hid: number;
    name: string;
    city: string | null;
    updated_at: string | null;
  }>("etg_hotels", "select=hid,name,city,updated_at&limit=2000");
  for (const h of hotels) {
    if (!h.hid || !h.name) continue;
    out.push({
      path: `/hospedagem/hotel/${h.hid}/${slugify(h.name)}`,
      lastmod: (h.updated_at || "").slice(0, 10) || undefined,
      changefreq: "weekly",
      priority: "0.75",
    });
  }

  // Companies ativas
  const companies = await fetchTable<{
    id: string;
    name: string;
    trade_name: string | null;
    is_active: boolean;
    updated_at: string | null;
  }>("companies", "select=id,name,trade_name,is_active,updated_at&is_active=eq.true&limit=1000");
  for (const c of companies) {
    const label = c.trade_name || c.name;
    if (!label) continue;
    const lastmod = (c.updated_at || "").slice(0, 10) || undefined;
    out.push({
      path: `/estabelecimento/${establishmentSlug(label)}`,
      lastmod,
      changefreq: "weekly",
      priority: "0.7",
    });
    if (c.id) {
      out.push({
        path: `/parceiro/${c.id}/ofertas`,
        lastmod,
        changefreq: "weekly",
        priority: "0.7",
      });
    }
  }

  // Ofertas ativas (Bahofertas) — uma URL por oferta
  const offers = await fetchTable<{
    id: string;
    title: string;
    is_active: boolean;
    updated_at: string | null;
  }>("offers", "select=id,title,is_active,updated_at&is_active=eq.true&limit=5000");
  for (const o of offers) {
    if (!o.id || !o.title) continue;
    out.push({
      path: `/oferta/${o.id}/${slugify(o.title)}`,
      lastmod: (o.updated_at || "").slice(0, 10) || undefined,
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  // NovaXS establishments — catálogo estático (69 itens)
  try {
    const mod = await import("../src/data/novaxs-catalog.ts").catch(() => null as any);
    const list: Array<{ name: string }> | undefined = (mod as any)?.NOVAXS_INTEGRATED_ESTABLISHMENTS;
    if (Array.isArray(list)) {
      for (const e of list) {
        out.push({
          path: `/estabelecimento/${establishmentSlug(e.name)}`,
          changefreq: "weekly",
          priority: "0.7",
        });
      }
    }
  } catch (e) {
    // fallback: leitura textual do arquivo (evita falhar build se import quebrar)
    try {
      const fs = await import("fs");
      const text = fs.readFileSync(resolve("src/data/novaxs-catalog.ts"), "utf-8");
      const matches = Array.from(text.matchAll(/\{\s*name:\s*"([^"]+)"/g));
      for (const m of matches) {
        out.push({
          path: `/estabelecimento/${establishmentSlug(m[1])}`,
          changefreq: "weekly",
          priority: "0.7",
        });
      }
    } catch {}
  }

  // Deduplica por path
  const seen = new Set<string>();
  return out.filter((e) => {
    if (seen.has(e.path)) return false;
    seen.add(e.path);
    return true;
  });
}

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const dynamic = await buildDynamic();
  const all = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
  console.log(
    `sitemap.xml written — ${all.length} entries (${staticEntries.length} estáticas + ${dynamic.length} dinâmicas)`,
  );
})();
