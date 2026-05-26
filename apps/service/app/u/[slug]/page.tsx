export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--text-secondary)]">read-only public globe</p>
        <h1 className="mt-3 text-3xl font-semibold">/{slug}</h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          This route is reserved for the live public Beenthere globe. It will render only profiles that are visible,
          not suspended, and not deleted.
        </p>
      </div>
    </main>
  )
}
