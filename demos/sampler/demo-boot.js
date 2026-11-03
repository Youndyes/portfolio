// Démo portfolio : charge automatiquement un kit pour que la page ne s'ouvre pas vide.
window.addEventListener('load', () => {
  let tries = 0;
  const timer = setInterval(() => {
    const { gui, engine } = window;
    if (++tries > 100) return clearInterval(timer);
    if (!gui || !engine || !engine.allPresets?.length) return;
    clearInterval(timer);
    const preset = engine.allPresets.find((p) => p.name === '808') || engine.allPresets[0];
    gui.presetSelect.value = preset.name;
    gui.handleLibrarySelection(preset.name);
    engine.loadPresetSounds(preset);
  }, 100);
});
