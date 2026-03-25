import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useServices() {
  return useQuery({ queryKey: ['services'], queryFn: api.getServices, refetchInterval: 10000 });
}
