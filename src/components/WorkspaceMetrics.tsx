import { request } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import { LightTooltip } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

interface UsagePoint {
  ts: number;
  cpuCores: number;
  memoryBytes: number;
}

interface SparklineProps {
  points: number[];
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  'aria-label'?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  points,
  color,
  width = 60,
  height = 18,
  strokeWidth = 1.5,
  ...rest
}) => {
  if (!points.length) {
    return (
      <svg width={width} height={height} {...rest}>
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="8"
          fill="#888"
        >
          N/A
        </text>
      </svg>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const normY = (p - min) / range;
      const y = height - normY * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} {...rest}>
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
};

function parseCPU(quantity: string | undefined): number {
  if (!quantity) return 0;
  if (quantity.endsWith('m')) {
    const milli = parseInt(quantity.slice(0, -1), 10);
    return isNaN(milli) ? 0 : milli / 1000; // convert millicores to cores
  }
  return parseFloat(quantity) || 0; // plain/scientific cores
}

function parseMemory(quantity: string | undefined): number {
  if (!quantity) return 0;
  const match = quantity.match(/^([0-9.]+)([KMGTE]i)?$/);
  if (!match) return parseFloat(quantity) || 0;
  const num = parseFloat(match[1]);
  const unit = match[2];
  const map: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Ei: 1024 ** 5,
  };
  return unit ? num * map[unit] : num;
}

async function fetchWorkspaceMetrics(namespace: string, workspaceName: string) {
  const labelSelector = `kaito.sh/workspace=${workspaceName}`;
  const url = `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods?labelSelector=${encodeURIComponent(
    labelSelector
  )}`;
  try {
    const resp: any = await request(url);
    const items = resp?.items || [];
    let cpuTotal = 0;
    let memTotal = 0;
    items.forEach((pod: any) => {
      (pod.containers || []).forEach((c: any) => {
        cpuTotal += parseCPU(c.usage?.cpu);
        memTotal += parseMemory(c.usage?.memory);
      });
    });
    return { cpuCores: cpuTotal, memoryBytes: memTotal };
  } catch (e) {
    return { cpuCores: 0, memoryBytes: 0, error: true } as const;
  }
}

export interface WorkspaceMetricsInlineProps {
  namespace: string;
  workspaceName: string;
  sampleIntervalMs?: number;
  maxPoints?: number;
}

export const WorkspaceMetricsInline: React.FC<WorkspaceMetricsInlineProps> = ({
  namespace,
  workspaceName,
  sampleIntervalMs = 15000,
  maxPoints = 25,
}) => {
  const [history, setHistory] = useState<UsagePoint[]>([]);
  const [error, setError] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function sample() {
      const data = await fetchWorkspaceMetrics(namespace, workspaceName);
      if (cancelled) return;
      if ((data as any).error) setError(true);
      const point: UsagePoint = {
        ts: Date.now(),
        cpuCores: data.cpuCores,
        memoryBytes: data.memoryBytes,
      };
      setHistory(prev => {
        const next = [...prev, point];
        if (next.length > maxPoints) next.splice(0, next.length - maxPoints);
        return next;
      });
    }

    sample();
    timerRef.current = window.setInterval(sample, sampleIntervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [namespace, workspaceName, sampleIntervalMs, maxPoints]);

  const cpuSeries = history.map(p => p.cpuCores);
  const memSeriesMi = history.map(p => p.memoryBytes / (1024 * 1024));

  const latest = history[history.length - 1];
  const cpuLabel = latest ? `${latest.cpuCores.toFixed(2)} cores` : '—';
  const memLabel = latest ? `${(latest.memoryBytes / (1024 * 1024)).toFixed(1)} Mi` : '—';

  const tooltip = error
    ? 'Metrics not available (metrics-server missing?)'
    : `CPU: ${cpuLabel}\nMemory: ${memLabel}`;

  return (
    <LightTooltip title={<pre style={{ margin: 0 }}>{tooltip}</pre>} arrow placement="left">
      <Box display="flex" flexDirection="column" gap={0.5} minWidth={70}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Sparkline points={cpuSeries} color="#1976d2" aria-label="cpu usage sparkline" />
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Sparkline points={memSeriesMi} color="#2e7d32" aria-label="memory usage sparkline" />
        </Box>
        {!history.length && (
          <Typography variant="caption" color="text.secondary">
            {error ? 'N/A' : '…'}
          </Typography>
        )}
      </Box>
    </LightTooltip>
  );
};

export default WorkspaceMetricsInline;
