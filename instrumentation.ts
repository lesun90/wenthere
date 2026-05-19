export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureOwnerUser } = await import('./lib/db');
    await ensureOwnerUser();
  }
}
