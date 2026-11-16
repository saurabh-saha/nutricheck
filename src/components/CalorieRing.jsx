// Daily calorie goal ring: eaten vs target, with what's left.
export default function CalorieRing({ eaten = 0, target = 2000, protein, proteinTarget, size = 140 }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target;
  const left = Math.round(target - eaten);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`${Math.round(eaten)} of ${Math.round(target)} kcal eaten today`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={over ? "#ef4444" : "#3b82f6"} strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        <text x="50%" y="46%" textAnchor="middle" className="fill-current text-2xl font-bold">{Math.abs(left)}</text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-gray-500 text-xs">{over ? "kcal over" : "kcal left"}</text>
      </svg>
      <div className="text-sm space-y-1">
        <div><span className="font-semibold">{Math.round(eaten)}</span> / {Math.round(target)} kcal eaten</div>
        {proteinTarget ? (
          <div className="text-gray-500 dark:text-gray-400">
            Protein {Math.round(protein || 0)} / {Math.round(proteinTarget)} g
          </div>
        ) : null}
      </div>
    </div>
  );
}
