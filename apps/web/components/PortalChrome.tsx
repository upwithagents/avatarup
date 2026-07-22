'use client';

import { useEffect, useState } from 'react';
import { AscentProgress, PortalHeader, type PortalHeaderApp } from '@upwithagents/ui';

interface PortalContext {
  userName?: string;
  userEmail?: string;
  apps: PortalHeaderApp[];
}

// Fetches the signed-in session's header data from the portal on mount.
// The portal's proxy already gates every request to /avatarup behind its
// own auth check, so any request this app actually receives belongs to an
// authenticated session — no logged-out UI state is needed here.
//
// `context` starts null on both the server render and the client's first
// render, and only flips once the mount effect's fetch resolves — so
// PortalHeader (whose ThemeToggle reads window.matchMedia/localStorage)
// never renders until after mount, avoiding a hydration mismatch. The
// app's own children are held back behind the same gate, otherwise they'd
// render immediately and the header would pop in on top of them later,
// shoving everything else down the page.
export function PortalChrome({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<PortalContext | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/portal/context')
      .then((res) => (res.ok ? (res.json() as Promise<PortalContext>) : null))
      .then((data) => {
        if (!cancelled) setContext(data);
      })
      .catch(() => {
        if (!cancelled) setContext(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Mounted unconditionally: unmounting it the instant `context`
          resolves would cut its own fill/fade animation short mid-transition,
          which read as a flicker or a broken/discontinuous bar. */}
      <AscentProgress />
      {context && (
        <>
          <div data-portal-chrome>
            <PortalHeader
              currentSlug="avatarup"
              apps={context.apps}
              userName={context.userName}
              userEmail={context.userEmail}
              logoutSlot={<a href="/api/auth/signout">Log out</a>}
            />
          </div>
          {children}
        </>
      )}
    </>
  );
}
