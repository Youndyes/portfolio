// Bouton flottant « ← Portfolio » ajouté aux démos qui gardent leur propre interface.
// Usage : <script src="../back-button.js" data-note="Texte optionnel"></script>
(() => {
  const note = document.currentScript?.dataset.note || '';
  const top = document.currentScript?.dataset.pos === 'top';
  const css = `
    #pf-back { position: fixed; left: 12px; bottom: 12px; z-index: 99999; display: flex; gap: 8px; align-items: center;
      font: 600 13px system-ui, -apple-system, 'Segoe UI', sans-serif; }
    #pf-back a { color: #17140a; background: #ffd23f; text-decoration: none; padding: 7px 12px;
      border: 2px solid #0a0b14; box-shadow: 2px 2px 0 rgba(0,0,0,.45); }
    #pf-back span { color: #f4f1e8; background: rgba(16,19,31,.88); padding: 6px 10px; border: 2px solid #0a0b14; }
    @media (max-width: 640px) { #pf-back span { display: none; } }`;
  const add = () => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'pf-back';
    if (top) Object.assign(box.style, { top: '12px', bottom: 'auto' });
    box.innerHTML = `<a href="../../">← Portfolio</a>${note ? `<span></span>` : ''}`;
    if (note) box.querySelector('span').textContent = note;
    document.body.appendChild(box);
  };
  if (document.body) add();
  else document.addEventListener('DOMContentLoaded', add);
})();
