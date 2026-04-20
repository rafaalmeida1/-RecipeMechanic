export default function LoginLoading() {
  return (
    <div
      className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-border/50 bg-card/30 p-8"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-muted" />
      <div className="space-y-3">
        <div className="mx-auto h-6 w-40 animate-pulse rounded-md bg-muted" />
        <div className="mx-auto h-4 w-full max-w-xs animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-11 w-full animate-pulse rounded-md bg-muted/70" />
      <div className="h-11 w-full animate-pulse rounded-md bg-muted/50" />
    </div>
  );
}
