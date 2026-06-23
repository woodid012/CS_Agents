import { signIn, auth } from '../../auth';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Sign in — CS Capital CRM' };

export default async function LoginPage({ searchParams }) {
  // Already signed in? Send them on.
  const session = await auth();
  const callbackUrl = searchParams?.callbackUrl || '/projects';
  if (session?.user) redirect(callbackUrl);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-4"
             style={{ backgroundColor: '#45B6BF' }}>
          <span className="text-white font-bold tracking-tight">CS</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">CS Capital CRM</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in with your <span className="font-medium">@cscapital.com.au</span> account to continue.
        </p>

        <form
          action={async () => {
            'use server';
            await signIn('microsoft-entra-id', { redirectTo: callbackUrl });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#45B6BF' }}
          >
            <MicrosoftIcon />
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}
