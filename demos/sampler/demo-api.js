// Démo portfolio : le backend Node/MongoDB n'est pas hébergé ici.
// Les lectures sont servies par des fichiers statiques ; les écritures
// (sauvegarde de preset, upload de sons) sont simulées en mémoire.
(() => {
  const realFetch = window.fetch.bind(window);
  const saved = [];
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    const isApi = /\/api\//.test(url);

    if (isApi && method === 'GET' && /\/api\/presets\/?$/.test(url)) {
      const res = await realFetch(input, init);
      const list = await res.json();
      return new Response(JSON.stringify([...saved, ...list]), { headers: { 'Content-Type': 'application/json' } });
    }
    if (isApi && method !== 'GET') {
      let body = {};
      try { body = typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch {}
      if (method === 'POST' && /\/api\/presets\/?$/.test(url) && body.name) {
        saved.unshift({ ...body, isFactoryPresets: false });
      }
      return new Response(JSON.stringify({ message: 'Démo : action simulée (pas de serveur)', preset: body }), {
        status: method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return realFetch(input, init);
  };
})();
