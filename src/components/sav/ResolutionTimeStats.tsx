import { Clock } from 'lucide-react';

interface ResolutionTimeStatsProps {
  stats: {
    medianTime: number;
    avgTimeFiltered: number;
    avgTimeRaw: number;
    outliersExcluded: number;
    q1: number;
    q3: number;
    iqr: number;
  };
}

export const ResolutionTimeStats = ({ stats }: ResolutionTimeStatsProps) => {
  const formatDays = (days: number): string => {
    if (days === 0) return 'N/A';
    if (days < 1) return '< 1 jour';
    if (days === 1) return '1 jour';
    return `${days.toFixed(1)} jours`;
  };

  return null;
};
