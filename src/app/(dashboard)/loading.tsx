export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-full max-w-md animate-pulse rounded-lg bg-muted/70" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-muted/50" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-border/40 bg-muted/20" />
      <div className="flex gap-3">
        <div className="h-11 w-32 animate-pulse rounded-md bg-muted/60" />
        <div className="h-11 w-40 animate-pulse rounded-md bg-muted/40" />
      </div>
    </div>
  );
}
