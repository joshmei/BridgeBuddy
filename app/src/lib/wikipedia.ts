import { fetchWithTimeout, WIKIMEDIA_HEADERS } from './http'

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

export async function fetchWikipediaSummary(nameOrTag: string): Promise<WikipediaSummary | null> {
  const title = encodeURIComponent(toTitle(nameOrTag))
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
  const res = await fetchWithTimeout(url, { headers: WIKIMEDIA_HEADERS })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`)
  const data = (await res.json()) as SummaryResponse

  // Disambiguation pages (e.g. "Walnut Street Bridge") aren't a real article.
  // CLAUDE.md: treat as "no article" until a picker is built (open decision #6).
  if (data.type === 'disambiguation') return null
  if (!data.extract) return null

  return {
    summary: data.extract,
    thumbnailUrl: data.thumbnail?.source ?? null,
    pageUrl: data.content_urls?.desktop?.page ?? null,
  }
}
