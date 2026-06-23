import { auth, signIn, signOut } from '../auth';

// Server component: reads the session and renders Sign in / Sign out.
// No client-side SessionProvider needed.
export default async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          'use server';
          await signIn('microsoft-entra-id', { redirectTo: '/projects' });
        }}
      >
        <button
          type="submit"
          className="px-3 py-1.5 rounded text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#45B6BF' }}
        >
          Sign in
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-xs hidden sm:inline">{session.user.email}</span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <button
          type="submit"
          className="px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
