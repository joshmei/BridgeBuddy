import { fetchWithTimeout, wikimediaHeaders } from './http'

// Wikipedia REST summary endpoint — summary text + thumbnail (§7). Coverage is
// excellent for famous bridges, patchy for regional, nothing for obscure;
// callers must handle null gracefully (§9).

export interface WikipediaSummary {
  summary: string
  thumbnailUrl: string | null
  pageUrl: string | null
}

interface SummaryResponse {
  type?: string
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
  content_urls?: { desktop?: { page?: string } }
}

// Accepts either a plain bridge name or an OSM-style "en:Brooklyn Bridge"
// wikipedia tag (strips the language prefix).
function toTitle(nameOrTag: string): string {
  const stripped = nameOrTag.includes(':') ? nameOrTag.split(':').slice(1).join(':') : nameOrTag
  return stripped.trim().replace(/ /g, '_')
}

const BRIDGE_RE =
  /\b(bridges?|viaducts?|aqueducts?|causeways?|footbridges?|overpass|trestle|spans?|crossings?|arch(es)?|cantilever|suspension|truss|river|canal)\b/i

// Guard against Wikipedia returning an unrelated article for a bridge name —
// most often a person whose surname is "Bridge" (e.g. the rugby player George
// Bridge), or a same-named town. A blank summary is better than a biography.
//
// Prefer the short `description` ("bridge in New York City" vs "rugby union
// player") — it's a clean categorization and, unlike the extract, doesn't
// contain the subject's own name (which would self-match on "Bridge"). Only when
// there's no description do we check the extract, with the title stripped out so
// a subject NAMED "… Bridge" can't pass on its own name.
function isAboutBridge(data: SummaryResponse): boolean {
  if (data.description && data.description.trim()) {
    return BRIDGE_RE.test(data.description)
  }
  const extract = data.extract ?? ''
  const stripped = data.title ? extract.split(data.title).join(' ') : extract
  return BRIDGE_RE.test(stripped)
}

export async function fetchWikipediaSummary(nameOrTag: string): Promise<WikipediaSummary | null> {
  const title = encodeURIComponent(toTitle(nameOrTag))
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
  const res = await fetchWithTimeout(url, { headers: wikimediaHeaders() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`)
  const data = (await res.json()) as SummaryResponse

  // Disambiguation pages (e.g. "Walnut Street Bridge") aren't a real article.
  // CLAUDE.md: treat as "no article" until a picker is built (open decision #6).
  if (data.type === 'disambiguation') return null
  if (!data.extract) return null

  // The title resolved to something that isn't a bridge (person/place/unrelated)
  // — discard rather than show wrong content (§9: a gap beats a wrong fact).
  if (!isAboutBridge(data)) return null

  return {
    summary: data.extract,
    thumbnailUrl: data.thumbnail?.source ?? null,
    pageUrl: data.content_urls?.desktop?.page ?? null,
  }
}
