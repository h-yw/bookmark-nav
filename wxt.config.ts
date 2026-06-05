import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Bookmark Nav',
    description: '浏览器书签导航页 — 将收藏夹变成美观的网址导航',
    permissions: ['bookmarks'],
    chrome_url_overrides: {
      newtab: 'newtab.html',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  webExt: {
    binaries: {
      edge: process.env.EDGE_BINARY ?? '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
    },
  },
});
