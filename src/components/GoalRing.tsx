import { CheckIcon, FlameIcon } from './icons';

/** Anillo de la meta diaria. El dibujo es decorativo: los minutos van también en texto. */
export function GoalRing({ fraction, done }: { fraction: number; done: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className={`goal-ring ${done ? 'is-done' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 56 56" width={56} height={56}>
        <circle className="goal-ring-track" cx="28" cy="28" r={r} />
        <circle
          className="goal-ring-value"
          cx="28"
          cy="28"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform="rotate(-90 28 28)"
        />
      </svg>
      {done && <CheckIcon />}
    </span>
  );
}

/** Racha: icono + número + «días», nunca solo el número. */
export function StreakChip({ count }: { count: number }) {
  return (
    <span className={`streak ${count > 0 ? 'is-active' : ''}`}>
      <FlameIcon />
      <span>
        <span className="visually-hidden">Racha: </span>
        {count} {count === 1 ? 'día' : 'días'}
      </span>
    </span>
  );
}
