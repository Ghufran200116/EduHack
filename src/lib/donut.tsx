interface Slice { key: string; label: string; value: number; color: string }

export function Donut({ slices, size = 220, thickness = 28, centerLabel, centerSub }: {
  slices: Slice[]; size?: number; thickness?: number; centerLabel?: string; centerSub?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[260px]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={thickness} />
      {slices.map((s) => {
        const frac = s.value / total;
        const len = frac * C;
        const dash = `${len} ${C - len}`;
        const offset = C * 0.25 - acc * C;
        acc += frac;
        return (
          <circle key={s.key} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={dash} strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
        );
      })}
      {centerLabel && (
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight={800} fill="#1E3349">{centerLabel}</text>
      )}
      {centerSub && (
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10" fontWeight={600} fill="#6b7280">{centerSub}</text>
      )}
    </svg>
  );
}
