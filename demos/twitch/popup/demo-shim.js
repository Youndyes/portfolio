// Démo portfolio : simule l'environnement d'une extension Chrome dans une page web.
//  - chrome.storage.local  → localStorage
//  - API Twitch Helix      → données fictives (aucun identifiant n'est utilisé)
// Le mode est choisi par la page parente : popup.html?mode=live | offline
(() => {
  const mode = new URLSearchParams(location.search).get('mode') || 'live';
  const KEY = 'demo-ext-storage';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

  window.chrome = {
    storage: {
      local: {
        get(keys, cb) {
          const all = read();
          const list = keys == null ? Object.keys(all) : Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const k of list) if (k in all) out[k] = all[k];
          if (cb) cb(out);
          return Promise.resolve(out);
        },
        set(items, cb) {
          write({ ...read(), ...items });
          if (cb) cb();
          return Promise.resolve();
        },
      },
    },
    runtime: { getURL: (p) => p },
  };

  const thumb = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2b1055"/><stop offset="1" stop-color="#7597de"/></linearGradient></defs>
      <rect width="400" height="225" fill="url(#g)"/>
      <rect x="16" y="16" width="62" height="26" rx="4" fill="#e91916"/>
      <text x="47" y="34" font-family="Arial" font-weight="700" font-size="15" fill="#fff" text-anchor="middle">LIVE</text>
      <text x="200" y="125" font-family="Arial" font-weight="700" font-size="22" fill="#fff" text-anchor="middle">Aperçu du stream (démo)</text>
    </svg>`);

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('https://api.twitch.tv/')) {
      await new Promise((r) => setTimeout(r, 400));
      const data = mode === 'live'
        ? [{ title: 'Ranked toute la soirée — venez discuter !', game_name: 'League of Legends', viewer_count: 1284, thumbnail_url: thumb }]
        : [];
      return new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input, init);
  };
})();
