import type { NextConfig } from 'next';

// Served under /avatarup behind the upwithagents-portal's path rewrites (see
// upwithagents-portal/apps.config.ts) — matches the sibling up-apps'
// convention (walletup, homeup). Applies whether run standalone or via the
// portal, since Next.js's basePath is static per build, not per-request.
const BASE_PATH = '/avatarup';

const nextConfig: NextConfig = {
  transpilePackages: ['@avatarup/avatar-core', '@avatarup/avatar-scene'],
  // Default dev-mode route indicator renders bottom-left, colliding with the
  // camera-view overlay buttons in AvatarStage.
  devIndicators: {
    position: 'top-right',
  },
  basePath: BASE_PATH,
  // Mirrors basePath for app code that references public/ assets by root-
  // relative path (see packages/avatar-scene/src/base-path.ts) — Next.js
  // only rewrites its own routing/asset helpers, not string literals.
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
