/**
 * MRR Chart — last 6 months, inline SVG bars.
 * Server component (pure render from pre-computed data).
 */

export type MRRPoint = {
  label: string; // e.g. "Nov"
  mrr: number;
};

export default function MRRChart({ data }: { data: MRRPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.mrr));
  const width = 600;
  const height = 160;
  const padX = 36;
  const padTop = 18;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const n = data.length;
  const slot = innerW / Math.max(1, n);
  const barW = Math.min(44, slot * 0.6);

  const current = data[n - 1]?.mrr ?? 0;
  const prev = data[n - 2]?.mrr ?? 0;
  const delta = prev > 0 ? ((current - prev) / prev) * 100 : 0;

  return (
    <section
      style={{
        background: "#354654",
        border: "1px solid rgba(108,122,131,0.2)",
        borderRadius: 14,
        padding: "20px 22px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#6C7A83",
              marginBottom: 4,
            }}
          >
            MRR · Últimos 6 meses
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#E5E5E3",
              letterSpacing: -0.5,
            }}
          >
            {formatMXN(current)}
          </div>
        </div>
        {prev > 0 && (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background:
                delta >= 0
                  ? "rgba(180,249,101,0.15)"
                  : "rgba(255,107,107,0.15)",
              color: delta >= 0 ? "#B4F965" : "#FF6B6B",
            }}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs mes anterior
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 180, display: "block" }}
      >
        <defs>
          <linearGradient id="mrrBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B4F965" />
            <stop offset="100%" stopColor="#8FD44C" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="rgba(108,122,131,0.15)"
              strokeDasharray="3 4"
            />
          );
        })}

        {/* Bars + labels */}
        {data.map((d, i) => {
          const h = (d.mrr / max) * innerH;
          const x = padX + slot * i + (slot - barW) / 2;
          const y = padTop + innerH - h;
          const isLast = i === n - 1;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(1, h)}
                rx={4}
                fill="url(#mrrBar)"
                opacity={isLast ? 1 : 0.7}
              />
              <text
                x={x + barW / 2}
                y={padTop + innerH + 16}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#6C7A83"
              >
                {d.label}
              </text>
              {d.mrr > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#E5E5E3"
                >
                  {compactMXN(d.mrr)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function formatMXN(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function compactMXN(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}
