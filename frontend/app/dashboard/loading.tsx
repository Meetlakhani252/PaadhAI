export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-6 p-8">
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="h-10 w-72 rounded-xl bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 rounded-3xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
