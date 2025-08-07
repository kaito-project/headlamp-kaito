import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { request } from '@kinvolk/headlamp-plugin/lib/ApiProxy';
import WorkspaceMetricsInline from './WorkspaceMetrics';

interface WSKey {
  namespace: string;
  name: string;
  instanceType?: string;
  synthetic?: boolean; // demo synthetic entry (not from cluster)
}

interface WorkspaceListResp {
  items?: Array<{
    metadata?: { name?: string; namespace?: string };
    resource?: { instanceType?: string };
  }>;
}

async function listNamespaces(): Promise<string[]> {
  try {
    const resp: any = await request('/api/v1/namespaces');
    return resp?.items?.map((n: any) => n?.metadata?.name).filter(Boolean) || [];
  } catch (e) {
    return [];
  }
}

async function listWorkspacesInNamespace(ns: string): Promise<WSKey[]> {
  try {
    const resp: WorkspaceListResp = await request(
      `/apis/kaito.sh/v1beta1/namespaces/${ns}/workspaces`
    );
    return (
      resp.items?.map(i => ({
        namespace: ns,
        name: i.metadata?.name || '',
        instanceType: (i as any).resource?.instanceType,
      })) || []
    );
  } catch (e) {
    return [];
  }
}

async function listAllWorkspaces(): Promise<WSKey[]> {
  const namespaces = await listNamespaces();
  const all: WSKey[] = [];
  await Promise.all(
    namespaces.map(async ns => {
      const ws = await listWorkspacesInNamespace(ns);
      all.push(...ws);
    })
  );
  return all.sort((a, b) => a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name));
}

const MiniSparkline: React.FC<{ points: number[]; color: string; width?: number; height?: number }> = ({
  points,
  color,
  width = 60,
  height = 18,
}) => {
  if (!points.length) return <svg width={width} height={height} />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / Math.max(points.length - 1, 1);
  const d = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * (height - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return <svg width={width} height={height}><path d={d} fill="none" stroke={color} strokeWidth={1.5} /></svg>;
};

const SyntheticMetricsInline: React.FC<{ sampleIntervalMs?: number; maxPoints?: number }> = ({
  sampleIntervalMs = 4000,
  maxPoints = 30,
}) => {
  const [cpu, setCpu] = useState<number[]>([]);
  const [mem, setMem] = useState<number[]>([]); 
  const cpuRef = useRef(0.4);
  const memRef = useRef(400);

  useEffect(() => {
    let cancelled = false;
    function step() {
      // random walk with occasional spikes
      const spike = Math.random() < 0.15;
      const cpuDelta = spike ? Math.random() * 1.2 : (Math.random() - 0.5) * 0.2;
      const memDelta = spike ? Math.random() * 600 : (Math.random() - 0.5) * 40;
      cpuRef.current = Math.min(Math.max(cpuRef.current + cpuDelta, 0.05), 3.5);
      memRef.current = Math.min(Math.max(memRef.current + memDelta, 50), 4096);
      if (cancelled) return;
      setCpu(prev => {
        const next = [...prev, cpuRef.current];
        if (next.length > maxPoints) next.splice(0, next.length - maxPoints);
        return next;
      });
      setMem(prev => {
        const next = [...prev, memRef.current];
        if (next.length > maxPoints) next.splice(0, next.length - maxPoints);
        return next;
      });
    }
    step();
    const id = window.setInterval(step, sampleIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sampleIntervalMs, maxPoints]);

  const latestCpu = cpu[cpu.length - 1];
  const latestMem = mem[mem.length - 1];

  return (
    <Box display="flex" flexDirection="column" gap={0.5} minWidth={70}>
      <MiniSparkline points={cpu} color="#ff9800" />
      <MiniSparkline points={mem} color="#ab47bc" />
      <Typography variant="caption" color="text.secondary">
        {latestCpu?.toFixed(2) || '--'} cores / {latestMem ? `${latestMem.toFixed(0)} Mi` : '--'}
      </Typography>
    </Box>
  );
};

export const WorkspaceUsagePanel: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WSKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const list = await listAllWorkspaces();
        if (!cancelled) {
          // synthetic demo workspace at the start for visualization
            const synthetic: WSKey = {
            namespace: 'demo',
            name: 'demo-usage',
            synthetic: true,
          };
          setWorkspaces([synthetic, ...list]);
        }
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 60000); // refresh list every minute
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight={600}>
          Workspace Usage (CPU / Memory)
        </Typography>
        {loading && (
          <Typography variant="caption" color="text.secondary">
            Loading…
          </Typography>
        )}
      </Box>
      {error && (
        <Typography variant="body2" color="error" mb={1}>
          Unable to load workspaces (insufficient permissions?)
        </Typography>
      )}
      <Box display="flex" flexWrap="wrap" gap={2}>
        {workspaces.map(ws => (
          <Box
            key={`${ws.namespace}/${ws.name}`}
            display="flex"
            flexDirection="column"
            sx={{ border: '1px solid var(--border-color,#333)', borderRadius: 1, p: 1, minWidth: 140 }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap title={`${ws.namespace}/${ws.name}`}>
              {ws.name}
              <Typography component="span" variant="caption" color="text.secondary">
                {` (${ws.namespace})`}{ws.synthetic && ' *'}
              </Typography>
            </Typography>
            {ws.synthetic ? (
              <SyntheticMetricsInline />
            ) : (
              <WorkspaceMetricsInline
                namespace={ws.namespace}
                workspaceName={ws.name}
                sampleIntervalMs={15000}
                maxPoints={30}
              />
            )}
          </Box>
        ))}
        {!loading && !workspaces.length && !error && (
          <Typography variant="body2" color="text.secondary">
            No workspaces found.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default WorkspaceUsagePanel;
