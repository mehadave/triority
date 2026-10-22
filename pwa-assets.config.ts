import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, sizes: [16, 32, 64, 192, 512] },
    // The tile already has its own dark background; fill the edges to match.
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.15,
      resizeOptions: { background: '#1A1A1A' },
    },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#1A1A1A' } },
  },
  images: ['assets-src/triority_icon.png'],
});
