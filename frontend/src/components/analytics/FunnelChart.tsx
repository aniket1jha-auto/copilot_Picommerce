'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
}

// Gradient stops: cyan (#00BAF2) → navy (#002970)
const DEFAULT_COLORS = [
  '#00BAF2',
  '#0097D6',
  '#0076BA',
  '#00569E',
  '#002970',
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Stage extends FunnelStage {
  dropOffPct: number | null; // % that dropped off going to next stage
  color: string;
}

export function FunnelChart({ data }: FunnelChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const stages: Stage[] = data.map((d, i) => {
    const nextValue = data[i + 1]?.value ?? null;
    const dropOffPct =
      nextValue !== null && d.value > 0
        ? Math.round(((d.value - nextValue) / d.value) * 100)
        : null;
    return {
      ...d,
      color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      dropOffPct,
    };
  });

  const maxValue = stages[0]?.value ?? 1;

  // Layout constants
  const LABEL_WIDTH = 140;
  const VALUE_WIDTH = 72;
  const CONNECTOR_HEIGHT = 28;
  const BAR_HEIGHT = 36;
  const ROW_HEIGHT = BAR_HEIGHT + CONNECTOR_HEIGHT;
  const svgHeight = stages.length * ROW_HEIGHT - CONNECTOR_HEIGHT;
  const barAreaWidth = Math.max(width - LABEL_WIDTH - VALUE_WIDTH - 8, 80);

  const MIN_BAR_FRACTION = 0.15; // narrowest bar is at least 15% of max

  return (
    <div ref={containerRef} className="w-full select-none">
      <svg
        width={width}
        height={svgHeight}
        viewBox={`0 0 ${width} ${svgHeight}`}
        aria-label="Funnel chart"
      >
        {stages.map((stage, i) => {
          const fraction = maxValue > 0 ? stage.value / maxValue : 0;
          const barFraction = lerp(MIN_BAR_FRACTION, 1, fraction);
          const barW = barAreaWidth * barFraction;
          const barX = LABEL_WIDTH + (barAreaWidth - barW) / 2;
          const barY = i * ROW_HEIGHT;

          // Connector trapezoid to next stage
          const nextStage = stages[i + 1];
          const nextFraction = nextStage
            ? lerp(MIN_BAR_FRACTION, 1, nextStage.value / maxValue)
            : null;
          const nextBarW = nextFraction ? barAreaWidth * nextFraction : 0;
          const nextBarX = nextFraction
            ? LABEL_WIDTH + (barAreaWidth - nextBarW) / 2
            : 0;

          const connectorY = barY + BAR_HEIGHT;

          const passThrough =
            stage.dropOffPct !== null ? 100 - stage.dropOffPct : null;

          return (
            <motion.g
              key={stage.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.1, ease: 'easeOut' }}
            >
              {/* Stage label */}
              <text
                x={LABEL_WIDTH - 10}
                y={barY + BAR_HEIGHT / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={500}
                fill="#6B7280"
              >
                {stage.label}
              </text>

              {/* Bar */}
              <rect
                x={barX}
                y={barY}
                width={barW}
                height={BAR_HEIGHT}
                rx={4}
                fill={stage.color}
                opacity={0.9}
              />

              {/* Value on right */}
              <text
                x={LABEL_WIDTH + barAreaWidth + 8}
                y={barY + BAR_HEIGHT / 2 + 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={600}
                fill="#1A1A2E"
              >
                {stage.value.toLocaleString('en-AE')}
              </text>

              {/* Connector trapezoid to next bar */}
              {nextStage && nextBarW > 0 && (
                <path
                  d={`M ${barX} ${connectorY} L ${barX + barW} ${connectorY} L ${nextBarX + nextBarW} ${connectorY + CONNECTOR_HEIGHT} L ${nextBarX} ${connectorY + CONNECTOR_HEIGHT} Z`}
                  fill={stage.color}
                  opacity={0.15}
                />
              )}

              {/* Drop-off label in connector */}
              {passThrough !== null && nextStage && (
                <text
                  x={LABEL_WIDTH + barAreaWidth / 2}
                  y={connectorY + CONNECTOR_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="#6B7280"
                  fontWeight={500}
                >
                  {`${passThrough}% →`}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
