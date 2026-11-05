// Interface HTML : écran d'accueil, panneaux, invite d'entrée
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const paras = (arr) => (Array.isArray(arr) ? arr : [arr]).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
const tagList = (arr) =>
  arr && arr.length ? `<div class="tags">${arr.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '';
const linkBtns = (links) =>
  (links || [])
    .filter((l) => l && l.url)
    .map((l) => `<a class="px-btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`)
    .join('');

// Les PDF (CV, rapport) s'ouvrent toujours dans un nouvel onglet
const pdfLinks = (url, label) => `
  <div class="links doc-actions">
    <a class="px-btn primary" href="${esc(url)}" target="_blank" rel="noopener">📄 ${esc(label)} ↗</a>
    <a class="px-btn" href="${esc(url)}" download>⬇ Télécharger</a>
  </div>`;

const PROMPTS = {
  project: (z) => `Voir le projet « ${z.title} »`,
  about: () => 'En savoir plus sur moi',
  contact: () => 'Me contacter',
  cv: () => 'Consulter mon CV',
};

export class UI {
  constructor({ profile, zones, isTouch, onStart, onTeleport, onLeave }) {
    this.onLeave = onLeave;
    this.profile = profile;
    this.zones = zones;
    this.isTouch = isTouch;
    this.onStart = onStart;
    this.onTeleport = onTeleport;
    this.started = false;
    this.current = null;
    this.promptZone = undefined;

    const $ = (id) => document.getElementById(id);
    this.overlay = $('overlay');
    this.panel = $('panel');
    this.body = $('panel-body');
    this.prompt = $('prompt');
    this.intro = $('intro');

    document.title = `${profile.name} — Portfolio`;
    $('hud-name').textContent = profile.name;
    $('hud-role').textContent = `${profile.role} · ${profile.school}`;
    $('btn-list').addEventListener('click', () => this.openList());
    $('btn-help').addEventListener('click', () => this.openHelp());

    this.prompt.addEventListener('click', () => this.promptZone && this.openZone(this.promptZone));
    // Avant de partir vers une démo interne, on mémorise la position pour y revenir
    this.overlay.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-demo]');
      if (a && !a.target && this.onLeave) this.onLeave(this.current);
    }, true);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) return this.close();
      const el = e.target.closest('[data-close],[data-zone],[data-teleport],[data-list],[data-start]');
      if (!el) return;
      if (el.hasAttribute('data-close')) this.close();
      else if (el.hasAttribute('data-list')) this.openList();
      else if (el.hasAttribute('data-start')) { this.close(); this.start(); }
      else if (el.hasAttribute('data-zone')) {
        const z = this.zones.find((z) => z.id === el.dataset.zone);
        if (z) this.openZone(z, true);
      } else if (el.hasAttribute('data-teleport') && this.current) {
        const z = this.current;
        this.close();
        if (!this.started) this.start();
        this.onTeleport(z);
      }
    });
  }

  renderIntro() {
    const p = this.profile;
    const keys = `<div class="only-desktop"><div><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou <kbd class="ar">↑</kbd><kbd class="ar">←</kbd><kbd class="ar">↓</kbd><kbd class="ar">→</kbd> se déplacer</div></div>
      <div class="only-desktop"><kbd>Espace</kbd> / <kbd>E</kbd> entrer dans un bâtiment</div>
      <div class="only-compact">Flèches à l’écran pour vous déplacer, bouton <b>ENTRER</b> sur une dalle.</div>`;
    document.getElementById('intro-card').innerHTML = `
      <p class="kicker">Portfolio</p>
      <h1>${esc(p.name)}</h1>
      <p class="intro-role">${esc(p.role)} · ${esc(p.school)}</p>
      <p class="intro-status">${esc(p.status)}</p>
      <div class="keys">${keys}</div>
      <p class="intro-tip">Roulez sur les dalles lumineuses pour découvrir mes projets.</p>
      <div class="intro-actions">
        <button class="px-btn primary" id="btn-start">▶ Démarrer</button>
        <button class="px-btn ghost" id="btn-classic">Version classique</button>
      </div>`;
    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-classic').addEventListener('click', () => this.openList());
    document.getElementById('btn-start').focus();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.intro.classList.add('hide');
    setTimeout(() => (this.intro.hidden = true), 400);
    this.onStart();
  }

  get isOpen() {
    return !this.overlay.hidden;
  }

  get blocking() {
    return this.isOpen || !this.started;
  }

  // Renvoie true si la touche a été consommée par l'UI
  handleKey(e) {
    if (this.isOpen) {
      if (e.code === 'Escape') this.close();
      return true;
    }
    if (!this.started) {
      if ((e.code === 'Enter' || e.code === 'Space') && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        this.start();
      }
      return true;
    }
    return false;
  }

  setPrompt(zone) {
    if (zone === this.promptZone) return;
    this.promptZone = zone;
    if (!zone) {
      this.prompt.hidden = true;
      return;
    }
    this.prompt.style.setProperty('--accent', zone.color);
    this.prompt.innerHTML = `<span class="key"><span class="only-desktop">ESPACE</span><span class="only-compact">TOUCHER</span></span>${esc(PROMPTS[zone.kind](zone))}`;
    this.prompt.hidden = false;
  }

  show(html, accent = '#ffd23f') {
    this.body.innerHTML = html;
    this.panel.style.setProperty('--accent', accent);
    this.overlay.hidden = false;
    this.panel.scrollTop = 0;
    this.panel.querySelector('.close').focus({ preventScroll: true });
  }

  close() {
    this.overlay.hidden = true;
    this.current = null;
    if (!this.started) document.getElementById('btn-start')?.focus();
  }

  openZone(zone, fromList = false) {
    this.current = zone;
    const p = this.profile;
    const back = fromList ? '<button class="px-btn ghost" data-list>← Liste</button>' : '';
    const go = fromList ? '<button class="px-btn" data-teleport>🚗 Y aller en voiture</button>' : '';
    let html = '';

    if (zone.kind === 'project') {
      const d = zone.data;
      html = `
        <header class="panel-head">
          <p class="kicker">Projet${d.year ? ' · ' + esc(d.year) : ''}</p>
          <h2>${esc(d.title)}</h2>
          ${tagList(d.tags)}
        </header>
        ${d.demo ? `<a class="px-btn primary demo-btn" href="${esc(d.demo.url)}" data-demo
            ${d.demo.external ? 'target="_blank" rel="noopener"' : ''}>▶ ${esc(d.demo.label)}${d.demo.external ? ' ↗' : ''}</a>` : ''}
        ${d.doc ? `<a class="px-btn primary demo-btn" href="${esc(d.doc.url)}" target="_blank" rel="noopener">📄 ${esc(d.doc.label)} ↗</a>` : ''}
        ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}
        ${d.image ? `<img class="shot" src="${esc(d.image)}" alt="Capture du projet ${esc(d.title)}">` : ''}
        <div class="prose">${paras(d.description)}</div>
        ${d.highlights?.length ? `<ul class="hl">${d.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        <div class="links">${linkBtns(d.links)}</div>`;
    } else if (zone.kind === 'about') {
      const skills = Object.entries(p.skills || {})
        .map(([k, v]) => `<div class="skill-row"><h3>${esc(k)}</h3>${tagList(v)}</div>`)
        .join('');
      html = `
        <header class="panel-head">
          <p class="kicker">À propos</p>
          <h2>${esc(p.name)}</h2>
          <p class="sub">${esc(p.role)} · ${esc(p.school)}</p>
        </header>
        <div class="prose">${paras(p.about)}</div>
        ${p.experience?.length ? `<h3 class="section-title">Expériences</h3><ul class="xp">${p.experience
          .map((x) => `<li><span class="xp-title">${esc(x.title)}</span><span class="xp-meta">${esc(x.org)} · ${esc(x.date)}</span></li>`)
          .join('')}</ul>` : ''}
        <h3 class="section-title">Compétences</h3>
        <div class="skills">${skills}</div>
        <div class="links">${p.cv ? `<a class="px-btn primary" href="${esc(p.cv)}" target="_blank" rel="noopener">📄 Voir mon CV ↗</a>` : ''}</div>`;
    } else if (zone.kind === 'contact') {
      html = `
        <header class="panel-head">
          <p class="kicker">Contact</p>
          <h2>Discutons !</h2>
          <p class="sub">${esc(p.status)}</p>
        </header>
        <div class="prose"><p>Le moyen le plus simple de me joindre est par e-mail. Je réponds rapidement.</p></div>
        <div class="links">
          ${p.email ? `<a class="px-btn primary" href="mailto:${esc(p.email)}">✉ ${esc(p.email)}</a>` : ''}
          ${linkBtns([{ label: 'LinkedIn', url: p.linkedin }, { label: 'GitHub', url: p.github }])}
        </div>`;
    } else if (zone.kind === 'cv') {
      html = `
        <header class="panel-head">
          <p class="kicker">Curriculum vitæ</p>
          <h2>Mon CV</h2>
          <p class="sub">${esc(p.status)}</p>
        </header>
        <div class="prose"><p>Mon CV s’ouvre dans un nouvel onglet. Vous pouvez aussi le télécharger.</p></div>
        ${p.cv ? pdfLinks(p.cv, 'Ouvrir mon CV') : '<p>CV bientôt disponible.</p>'}`;
    }
    html += back || go ? `<footer class="panel-foot">${back}${go}</footer>` : '';
    this.show(html, zone.color);
  }

  openList() {
    this.current = null;
    const p = this.profile;
    const cards = this.zones
      .filter((z) => z.kind === 'project')
      .map(
        (z) => `
        <button class="proj-card" data-zone="${esc(z.id)}" style="--accent:${esc(z.color)}">
          <span class="proj-year">${esc(z.data.year || '')}${z.data.demo ? '<span class="playable">▶ Jouable</span>' : ''}</span>
          <span class="proj-title">${esc(z.title)}</span>
          <span class="proj-short">${esc(z.data.short || '')}</span>
          ${tagList(z.data.tags)}
        </button>`,
      )
      .join('');
    this.show(`
      <header class="panel-head">
        <p class="kicker">Tous les projets</p>
        <h2>${esc(p.name)}</h2>
        <p class="sub">${esc(p.role)} · ${esc(p.school)} — ${esc(p.status)}</p>
      </header>
      <div class="proj-grid">${cards}</div>
      <footer class="panel-foot">
        <button class="px-btn" data-zone="about">À propos</button>
        <button class="px-btn" data-zone="contact">Contact</button>
        <button class="px-btn" data-zone="cv">CV</button>
        ${this.started ? '' : '<button class="px-btn primary" data-start>▶ Explorer en voiture</button>'}
      </footer>`);
  }

  openHelp() {
    this.current = null;
    this.show(`
      <header class="panel-head">
        <p class="kicker">Aide</p>
        <h2>Commandes</h2>
      </header>
      <div class="keys big">
        <div><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> / flèches — se déplacer (la voiture va dans la direction indiquée à l’écran)</div>
        <div><kbd>Espace</kbd> ou <kbd>E</kbd> — entrer dans le bâtiment</div>
        <div><kbd>R</kbd> — revenir au départ</div>
        <div><kbd>Molette</kbd> — zoom</div>
        <div><kbd>Clic</kbd> sur un bâtiment — l’ouvrir directement</div>
        <div><kbd>Échap</kbd> — fermer un panneau</div>
      </div>
      <footer class="panel-foot"><button class="px-btn" data-list>☰ Voir la liste des projets</button></footer>`);
  }
}
