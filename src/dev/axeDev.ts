/**
 * Solo en desarrollo: pasa axe-core por la página cada vez que cambia el DOM y muestra
 * en la consola los problemas de accesibilidad nuevos. No se incluye en la compilación de producción.
 */
import axe from 'axe-core';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const DEBOUNCE_MS = 1000;

export function startAxe() {
  const reported = new Set<string>();
  let timer: number | undefined;
  let running = false;

  const check = async () => {
    if (running) return;
    running = true;
    try {
      const { violations } = await axe.run(document, { runOnly: { type: 'tag', values: TAGS } });
      for (const v of violations) {
        const fresh = v.nodes.filter((n) => {
          const key = `${location.pathname}|${v.id}|${n.target.join(' ')}`;
          if (reported.has(key)) return false;
          reported.add(key);
          return true;
        });
        if (fresh.length === 0) continue;
        console.groupCollapsed(`%c[axe] ${v.impact}: ${v.help} (${fresh.length})`, 'color:#cf222e');
        console.info(v.helpUrl);
        for (const n of fresh) console.info(n.target.join(' '), document.querySelector(n.target.join(' ')) ?? '', n.failureSummary);
        console.groupEnd();
      }
    } finally {
      running = false;
    }
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void check(), DEBOUNCE_MS);
  };

  // Los cambios de la vista de cámara (canvas a 30 fps) no cambian el DOM, así que esto no se dispara en bucle.
  new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  schedule();
  console.info('[axe] Comprobación de accesibilidad activa (solo en desarrollo).');
}
