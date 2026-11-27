import { GOAL_OPTIONS, type GoalMinutes } from '../progress/activity';

const LABELS: Record<GoalMinutes, string> = { 5: 'Suave', 10: 'Normal', 15: 'Intenso' };

/** Elegir la meta diaria: 5, 10 o 15 minutos. */
export function GoalChoice({ value, onChange, name }: { value: GoalMinutes; onChange: (g: GoalMinutes) => void; name: string }) {
  return (
    <div className="goal-options">
      {GOAL_OPTIONS.map((g) => (
        <label key={g} className="choice goal-option">
          <input type="radio" name={name} value={g} checked={g === value} onChange={() => onChange(g)} />
          <span className="choice-text">
            <strong>{g} min al día</strong>
            <span className="muted">{LABELS[g]}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
