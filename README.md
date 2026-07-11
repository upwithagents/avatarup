# AvatarUp

Your living avatar — see it, shape it, and eventually talk to it on PC,
mobile, and VR.

Part of the **up** ecosystem (walletup, sheetup, homeup, …), where each
project is an "expertise" that will plug into a shared agent core
(upagent). AvatarUp's expertise: looking good as a living avatar.

## Status

POC in progress: a browser-based avatar customizer — one humanoid base
mesh, morph sliders (body/face), appearance colors, GPU-accelerated
rendering via three.js/React Three Fiber. Movement, physics, VR (Quest),
and agent-driven behavior come in later phases.

## Stack

pnpm monorepo:

- `apps/web` — Next.js + TypeScript + Tailwind customizer UI
- `packages/avatar-core` — framework-agnostic avatar profile model
- `packages/avatar-scene` — React Three Fiber viewer components

## Running

```bash
pnpm install
pnpm dev        # → http://localhost:3000
pnpm test       # Vitest unit tests
```
