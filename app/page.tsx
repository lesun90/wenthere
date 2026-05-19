import { redirect } from 'next/navigation';

export default function Home() {
  const username = process.env.OWNER_USERNAME ?? 'owner';
  redirect(`/${username}`);
}
