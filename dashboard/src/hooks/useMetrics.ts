import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useLatency(params?: { last?: string; service?: string }) {
  return useQuery({ queryKey: ['latency', params], queryFn: () => api.getLatency(params), refetchInterval: 10000 });
}

export function useTimeseries(params?: { service?: string; interval?: number }) {
  return useQuery({ queryKey: ['timeseries', params], queryFn: () => api.getTimeseries(params), refetchInterval: 15000 });
}
