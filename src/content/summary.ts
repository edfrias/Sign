import { getContent } from './loader';

/**
 * Resumen de una lengua para elegirla: «568 signos» o «3 letras» (si todo es dactilología),
 * y «en pruebas» si ninguno de sus signos está contrastado con una fuente fiable.
 */
export function languageSummary(langId: string) {
  const { signs } = getContent(langId);
  const n = signs.length;
  const onlyLetters = n > 0 && signs.every((s) => s.category === 'Alfabeto');
  const noun = onlyLetters ? (n === 1 ? 'letra' : 'letras') : n === 1 ? 'signo' : 'signos';
  return { count: `${n} ${noun}`, testing: n > 0 && signs.every((s) => s.verified === false) };
}
