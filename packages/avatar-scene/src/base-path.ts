/**
 * Prefixes a root-relative public asset path with the host app's Next.js
 * `basePath` (via `NEXT_PUBLIC_BASE_PATH`), if any. Needed when this app is
 * served under a path prefix behind the upwithagents-portal
 * (upwithagents-portal/apps.config.ts) rather than at the origin root.
 * Empty/unset in standalone dev, so behavior is unchanged outside the portal.
 */
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
