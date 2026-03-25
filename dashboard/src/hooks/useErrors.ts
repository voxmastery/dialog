import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useErrors(params?: { last?: string; service?: string; level?: string }) {
  return useQuery({ queryKey: ['errors', params], queryFn: () => api.getErrors(params), refetchInterval: 30000 });
}
