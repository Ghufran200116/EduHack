import { DIMENSIONS, type DimensionKey } from "./dimensions";

export interface RadialBlendProps {
  scores: Record<DimensionKey, number>;
  size?: number;
}

/**
 * Learning fingerprint: a layered blended radial visualization.
 * Each dimension renders as a soft translucent blob whose radius is its weight,
 * overlapping to communicate "blend, not winner".
 */
export function LearningFingerprint({ scores, size = 420 }: RadialBlendProps) {
  const pad = 74; // generous room for outer labels
  const radius = Math.max(40, size / 2 - pad);
  const cx = size / 2;
  const cy = size / 2;
  const max = Math.max(...Object.values(scores), 1);
  const slots = DIMENSIONS.length;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto max-w-full"
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Your learning fingerprint"
    >
      <defs>
        {DIMENSIONS.map((d) => (
          <radialGradient key={d.key} id={`fp-${d.key}`}>
            <stop offset="0%" stopColor={d.hex} stopOpacity="0.85" />
            <stop offset="70%" stopColor={d.hex} stopOpacity="0.35" />
            <stop offset="100%" stopColor={d.hex} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      {/* concentric rings — sun motif */}
      {[0.95, 0.78, 0.6, 0.42].map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={radius * r} fill="none" stroke="#F2C200" strokeOpacity={0.15} strokeWidth={1} />
      ))}
      {DIMENSIONS.map((d, i) => {
        const weight = scores[d.key] / max;
        const angle = (i / slots) * Math.PI * 2 - Math.PI / 2;
        const dist = radius * 0.3;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        const r = 22 + weight * radius * 0.52;
        return (
          <circle key={d.key} cx={x} cy={y} r={r} fill={`url(#fp-${d.key})`} style={{ mixBlendMode: "multiply" }} />
        );
      })}
      {/* dimension labels around */}
      {DIMENSIONS.map((d, i) => {
        const angle = (i / slots) * Math.PI * 2 - Math.PI / 2;
        const dotR = radius;
        const labelR = radius + 18;
        const dotX = cx + Math.cos(angle) * dotR;
        const dotY = cy + Math.sin(angle) * dotR;
        const x = cx + Math.cos(angle) * labelR;
        const y = cy + Math.sin(angle) * labelR;
        const pct = total > 0 ? Math.round((scores[d.key] / total) * 100) : 0;

        // Horizontal alignment: center for top/bottom, start/end for sides
        let anchor: "start" | "middle" | "end" = "middle";
        if (Math.cos(angle) > 0.3) anchor = "start";
        else if (Math.cos(angle) < -0.3) anchor = "end";

        return (
          <g key={d.key}>
            <circle cx={dotX} cy={dotY} r={4} fill={d.hex} />
            <text
              x={x}
              y={y + 4}
              textAnchor={anchor}
              fontSize="9"
              fontWeight={800}
              fill="#1E3349"
              style={{ paintOrder: "stroke", stroke: "#FFFFFF", strokeWidth: 3, strokeOpacity: 0.9 }}
            >
              {d.label} {pct}%
            </text>
            <text
              x={x}
              y={y + 4}
              textAnchor={anchor}
              fontSize="9"
              fontWeight={800}
              fill="#1E3349"
            >
              {d.label} {pct}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
