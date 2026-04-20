export default function CustomerLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="h-5 w-40 animate-pulse rounded bg-muted/60" />
      <div className="flex gap-4">
        <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-full max-w-sm animate-pulse rounded bg-muted/50" />
        </div>
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-muted/20" />
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
        <div className="h-28 animate-pulse rounded-xl bg-muted/15" />
      </div>
    </div>
  );
}
