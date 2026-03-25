import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useJourney(userId: string | undefined) {
  return useQuery({
    queryKey: ['journey', userId],
    queryFn: () => api.getJourney(userId!),
    enabled: !!userId,
  });
}
