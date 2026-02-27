import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, subWeeks, differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface ResolutionTimeStats {
  medianTime: number;
  avgTimeFiltered: number;
  avgTimeRaw: number;
  outliersExcluded: number;
  q1: number;
  q3: number;
  iqr: number;
}

interface MonthlyResolution {
  month: string;
  medianTime: number;
  count: number;
}

interface SavStatistics {
  activeSavCount: number;
  avgResolutionTime: number;
  completedThisWeek: number;
  completedLastWeek: number;
  technicianStats: Array<{
    technicianName: string;
    savCount: number;
    avgResolutionTime: number;
  }>;
  statusDistribution: {
    nouvelle: number;
    en_cours: number;
    terminee: number;
  };
  priorityDistribution: {
    high: number;
    normal: number;
  };
  avgResponseTime: number;
  quickInterventionRate: number;
  resolutionTimeStats: ResolutionTimeStats;
  monthlyResolutionTrend: MonthlyResolution[];
}

const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const calculateQuartiles = (values: number[]): { q1: number; q3: number; iqr: number } => {
  if (values.length === 0) return { q1: 0, q3: 0, iqr: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length / 4);
  const q3Index = Math.floor((sorted.length * 3) / 4);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  return { q1, q3, iqr };
};

export const useSavStatistics = () => {
  const [statistics, setStatistics] = useState<SavStatistics>({
    activeSavCount: 0,
    avgResolutionTime: 0,
    completedThisWeek: 0,
    completedLastWeek: 0,
    technicianStats: [],
    statusDistribution: {
      nouvelle: 0,
      en_cours: 0,
      terminee: 0
    },
    priorityDistribution: {
      high: 0,
      normal: 0
    },
    avgResponseTime: 0,
    quickInterventionRate: 0,
    resolutionTimeStats: {
      medianTime: 0,
      avgTimeFiltered: 0,
      avgTimeRaw: 0,
      outliersExcluded: 0,
      q1: 0,
      q3: 0,
      iqr: 0
    },
    monthlyResolutionTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      const { data: savRequests, error: savError } = await supabase
        .from('sav_requests')
        .select(`
          *,
          sav_interventions (*)
        `)
        .order('requested_at', { ascending: false });

      if (savError) throw savError;

      console.log('Total SAV requests:', savRequests?.length);
      console.log('Sample SAV request:', savRequests?.[0]);

      const activeSavs = savRequests?.filter(
        sav => sav.status === 'nouvelle' || sav.status === 'en_cours'
      ) || [];

      const completedSavs = savRequests?.filter(sav => sav.status === 'terminee') || [];

      console.log('Active SAVs:', activeSavs.length);
      console.log('Completed SAVs:', completedSavs.length);
      console.log('Week start:', thisWeekStart);
      console.log('Week end:', thisWeekEnd);

      const completedThisWeek = completedSavs.filter(sav => {
        const completedDate = sav.resolved_at ? new Date(sav.resolved_at) : new Date(sav.created_at);
        return completedDate >= thisWeekStart && completedDate <= thisWeekEnd;
      }).length;

      const completedLastWeek = completedSavs.filter(sav => {
        const completedDate = sav.resolved_at ? new Date(sav.resolved_at) : new Date(sav.created_at);
        return completedDate >= lastWeekStart && completedDate <= lastWeekEnd;
      }).length;

      const resolutionTimes: number[] = [];
      let totalResponseTime = 0;
      let responseCount = 0;
      let quickInterventionCount = 0;

      completedSavs.forEach(sav => {
        if (sav.requested_at && sav.resolved_at) {
          const resolutionTime = differenceInDays(
            new Date(sav.resolved_at),
            new Date(sav.requested_at)
          );
          resolutionTimes.push(Math.max(0, resolutionTime));
        }

        if (sav.sav_interventions && sav.sav_interventions.length > 0) {
          const firstIntervention = sav.sav_interventions[0];
          if (firstIntervention.started_at && sav.requested_at) {
            const responseTime = differenceInDays(
              new Date(firstIntervention.started_at),
              new Date(sav.requested_at)
            );
            totalResponseTime += Math.max(0, responseTime);
            responseCount++;
          }

          if (sav.is_quick_intervention) {
            quickInterventionCount++;
          }
        }
      });

      const medianTime = calculateMedian(resolutionTimes);
      const { q1, q3, iqr } = calculateQuartiles(resolutionTimes);
      const upperBound = q3 + 1.5 * iqr;

      const filteredTimes = resolutionTimes.filter(time => time <= upperBound);
      const outliersExcluded = resolutionTimes.length - filteredTimes.length;

      const avgTimeRaw = resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

      const avgTimeFiltered = filteredTimes.length > 0
        ? filteredTimes.reduce((sum, time) => sum + time, 0) / filteredTimes.length
        : 0;

      const avgResolutionTime = avgTimeRaw;
      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
      const quickInterventionRate = responseCount > 0 ? (quickInterventionCount / responseCount) * 100 : 0;

      const resolutionTimeStats: ResolutionTimeStats = {
        medianTime,
        avgTimeFiltered,
        avgTimeRaw,
        outliersExcluded,
        q1,
        q3,
        iqr
      };

      const { data: users } = await supabase
        .from('users')
        .select('id, display_name');

      const technicianMap = new Map<string, { name: string; savCount: number; totalTime: number }>();

      completedSavs
        .filter(sav => {
          const completedDate = sav.resolved_at ? new Date(sav.resolved_at) : new Date(sav.created_at);
          return completedDate >= thisWeekStart && completedDate <= thisWeekEnd;
        })
        .forEach(sav => {
          if (sav.sav_interventions && sav.sav_interventions.length > 0) {
            sav.sav_interventions.forEach((intervention: any) => {
              if (intervention.technician_id) {
                const user = users?.find(u => u.id === intervention.technician_id);
                const techName = user?.display_name || 'Non assigné';

                if (!technicianMap.has(intervention.technician_id)) {
                  technicianMap.set(intervention.technician_id, {
                    name: techName,
                    savCount: 0,
                    totalTime: 0
                  });
                }

                const techData = technicianMap.get(intervention.technician_id)!;
                techData.savCount++;

                if (sav.requested_at && sav.resolved_at) {
                  const resolutionTime = differenceInDays(
                    new Date(sav.resolved_at),
                    new Date(sav.requested_at)
                  );
                  techData.totalTime += Math.max(0, resolutionTime);
                }
              }
            });
          }
        });

      const technicianStats = Array.from(technicianMap.values())
        .map(tech => ({
          technicianName: tech.name,
          savCount: tech.savCount,
          avgResolutionTime: tech.savCount > 0 ? tech.totalTime / tech.savCount : 0
        }))
        .sort((a, b) => b.savCount - a.savCount);

      const statusDistribution = {
        nouvelle: savRequests?.filter(sav => sav.status === 'nouvelle').length || 0,
        en_cours: savRequests?.filter(sav => sav.status === 'en_cours').length || 0,
        terminee: savRequests?.filter(sav => sav.status === 'terminee').length || 0
      };

      const priorityDistribution = {
        high: activeSavs.filter(sav => sav.priority).length,
        normal: activeSavs.filter(sav => !sav.priority).length
      };

      const monthlyResolutionTrend: MonthlyResolution[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthCompletedSavs = completedSavs.filter(sav => {
          const completedDate = sav.resolved_at ? new Date(sav.resolved_at) : null;
          return completedDate && completedDate >= monthStart && completedDate <= monthEnd;
        });

        const monthResolutionTimes: number[] = [];
        monthCompletedSavs.forEach(sav => {
          if (sav.requested_at && sav.resolved_at) {
            const resolutionTime = differenceInDays(
              new Date(sav.resolved_at),
              new Date(sav.requested_at)
            );
            monthResolutionTimes.push(Math.max(0, resolutionTime));
          }
        });

        const monthMedian = calculateMedian(monthResolutionTimes);

        monthlyResolutionTrend.push({
          month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          medianTime: monthMedian,
          count: monthCompletedSavs.length
        });
      }

      setStatistics({
        activeSavCount: activeSavs.length,
        avgResolutionTime,
        completedThisWeek,
        completedLastWeek,
        technicianStats,
        statusDistribution,
        priorityDistribution,
        avgResponseTime,
        quickInterventionRate,
        resolutionTimeStats,
        monthlyResolutionTrend
      });
    } catch (err) {
      console.error('Error fetching SAV statistics:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  return {
    statistics,
    loading,
    error,
    refetch: fetchStatistics
  };
};
