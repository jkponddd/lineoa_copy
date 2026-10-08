// A decorative, CSS-drawn stand-in for a product screenshot — deliberately
// not a real screenshot (none exist yet), so it's built from plain divs at
// the same design tokens as the real app rather than an image that could
// be mistaken for an actual UI capture.
export function HeroMockup() {
  return (
    <div aria-hidden className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-xl">
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-amber-400/60" />
        <span className="size-2.5 rounded-full bg-emerald-400/60" />
      </div>
      <div className="flex h-64 sm:h-72">
        <div className="flex w-12 flex-col items-center gap-3 border-r bg-muted/30 py-3 sm:w-14">
          <div className="size-6 rounded-md bg-primary/70" />
          <div className="size-6 rounded-md bg-foreground/10" />
          <div className="size-6 rounded-md bg-foreground/10" />
          <div className="size-6 rounded-md bg-foreground/10" />
        </div>
        <div className="flex w-28 flex-col gap-2 border-r p-2.5 sm:w-36">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-md p-1.5" style={{ opacity: i === 0 ? 1 : 0.5 }}>
              <span className="size-6 shrink-0 rounded-full bg-primary/30" />
              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-foreground/20" />
                <div className="h-1.5 w-2/3 rounded-full bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="ml-auto w-2/3 rounded-lg rounded-tr-sm bg-primary/15 p-2">
            <div className="h-1.5 w-full rounded-full bg-primary/40" />
            <div className="mt-1 h-1.5 w-1/2 rounded-full bg-primary/30" />
          </div>
          <div className="w-3/4 rounded-lg rounded-tl-sm bg-muted p-2">
            <div className="h-1.5 w-full rounded-full bg-foreground/20" />
          </div>
          <div className="ml-auto w-1/2 rounded-lg rounded-tr-sm bg-primary/15 p-2">
            <div className="h-1.5 w-full rounded-full bg-primary/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
