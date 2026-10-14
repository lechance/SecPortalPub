/**
 * SecPortal marketing site — Cloudflare Worker.
 *
 * Serves the static files from ./dist (bound as ASSETS). The wrangler.toml
 * routes unmatched paths to index.html, so fragment links like /#auth work.
 * This worker mainly exists as the entry point and a place for future
 * request-time logic (custom headers, redirects, A/B, etc.).
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
