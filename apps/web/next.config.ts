import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@avatarup/avatar-core', '@avatarup/avatar-scene'],
  // Default dev-mode route indicator renders bottom-left, colliding with the
  // camera-view overlay buttons in AvatarStage.
  devIndicators: {
    position: 'top-right',
  },
};

export default nextConfig;
