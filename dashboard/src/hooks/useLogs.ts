import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useLogs(params?: { last?: string; service?: string; level?: string; path?: string; grep?: string; limit?: number }) {
  return useQuery({ queryKey: ['logs', params], queryFn: () => api.getLogs(params), refetchInterval: 15000, refetchIntervalInBackground: false });
}
