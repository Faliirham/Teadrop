"use client";

import { useState } from "react";
import { idr } from "@/components/ui";

type BarPoint = {
  label: string;
  value: number;
};

export function BarChart({ data }: { data: BarPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 320;
  const H = 160;
  const pad = 8;
  const barW = Math.max(10, (W - pad * 2) / data.length - 8);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {/* gridlines */}
        {[0, 0.5, 1].map((f) => {
          const y = H - 24 - (H - 32) * f;
          return (
            <line
              key={f}
              x1={pad}
              x2={W - pad}
              y1={y}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {data.map((d, i) => {
          const x = pad + (i * (W - pad * 2)) / data.length + 4;
          const barH = ((H - 32) * d.value) / max;
          const y = H - 24 - barH;
          const active = hovered === i;
          return (
            <g key={i}>
              {active && (
                <rect
                  x={x - 3}
                  y={16}
                  width={barW + 6}
                  height={H - 40}
                  rx={6}
                  className="fill-emerald-500/10"
                />
              )}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, d.value > 0 ? 2 : 0)}
                rx={5}
                className={`cursor-pointer transition-all duration-300 ${
                  active
                    ? "fill-emerald-600 dark:fill-emerald-400"
                    : "fill-emerald-400 dark:fill-emerald-500/60"
                }`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] dark:fill-slate-500"
              >
                {d.label}
              </text>
              {active && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200"
                >
                  {idr(d.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HorizontalBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500 dark:bg-emerald-400"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
            {idr(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
