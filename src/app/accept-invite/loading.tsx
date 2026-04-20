export default function AcceptInviteLoading() {
  return (
    <div
      className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-border/50 bg-card/30 p-8"
      aria-busy="true"
      aria-label="Carregando"
    >
      <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-md bg-muted/70" />
      <div className="h-11 w-full animate-pulse rounded-md bg-muted/50" />
    </div>
  );
}
