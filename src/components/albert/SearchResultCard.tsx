import { ExternalLink } from 'lucide-react';

interface SearchResultCardProps {
  results: { title: string; url: string; snippet: string }[];
}

export function SearchResultCard({ results }: SearchResultCardProps) {
  if (!results.length) return null;

  return (
    <div className="mx-4 mb-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Resultados de búsqueda web</p>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="text-sm">
            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {r.title}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-medium">{r.title}</span>
            )}
            {r.snippet && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.snippet}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
