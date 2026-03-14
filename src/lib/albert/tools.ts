import { getApiKeys } from './providers';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  const key = getApiKeys().tavily;
  if (!key) throw new Error('No Tavily key');

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  )}`;

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`DDG proxy error: ${res.status}`);

  const html = await res.text();
  const results: SearchResult[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('.result__a');

  links.forEach((el, i) => {
    if (i >= 5) return;
    const a = el as HTMLAnchorElement;
    const snippetEl = el.closest('.result')?.querySelector('.result__snippet');
    results.push({
      title: a.textContent?.trim() || '',
      url: a.href || '',
      snippet: snippetEl?.textContent?.trim() || '',
    });
  });

  return results;
}

export async function executeWebSearch(query: string): Promise<SearchResult[]> {
  const keys = getApiKeys();

  if (keys.tavily) {
    try {
      return await searchTavily(query);
    } catch {
      // fall through to DDG
    }
  }

  try {
    return await searchDuckDuckGo(query);
  } catch {
    return [{ title: 'Search failed', url: '', snippet: 'Could not perform web search. Try again later.' }];
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (!results.length) return 'No results found.';
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join('\n\n');
}
