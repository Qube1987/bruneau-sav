import { TrendingUp, BarChart3 } from 'lucide-react';

interface MonthlyResolution {
  month: string;
  medianTime: number;
  count: number;
}

interface ResolutionTrendChartProps {
  data: MonthlyResolution[];
}

export const ResolutionTrendChart = ({ data }: ResolutionTrendChartProps) => {
  const maxMedianTime = Math.max(...data.map(d => d.medianTime), 1);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const formatDays = (days: number): string => {
    if (days === 0) return '0j';
    if (days < 1) return '< 1j';
    if (days === 1) return '1j';
    return `${days.toFixed(1)}j`;
  };

  const getBarColor = (medianTime: number): string => {
    if (medianTime === 0) return 'bg-gray-300';
    if (medianTime <= 2) return 'bg-green-500';
    if (medianTime <= 5) return 'bg-yellow-500';
    if (medianTime <= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBarColorHover = (medianTime: number): string => {
    if (medianTime === 0) return 'hover:bg-gray-400';
    if (medianTime <= 2) return 'hover:bg-green-600';
    if (medianTime <= 5) return 'hover:bg-yellow-600';
    if (medianTime <= 10) return 'hover:bg-orange-600';
    return 'hover:bg-red-600';
  };

  const trend = data.length >= 2
    ? data[data.length - 1].medianTime - data[data.length - 2].medianTime
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Évolution du Temps de Résolution</h3>
        </div>
        {trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${
            trend < 0
              ? 'text-green-700 bg-green-50'
              : 'text-red-700 bg-red-50'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>
              {trend < 0 ? '↓' : '↑'} {Math.abs(trend).toFixed(1)}j ce mois
            </span>
          </div>
        )}
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between items-end h-64 gap-2">
          {data.map((item, index) => {
            const barHeight = item.medianTime > 0
              ? (item.medianTime / maxMedianTime) * 100
              : 0;

            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${getBarColor(item.medianTime)} ${getBarColorHover(item.medianTime)} relative group`}
                    style={{ height: `${Math.max(barHeight, 3)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      <div className="font-semibold">{formatDays(item.medianTime)}</div>
                      <div className="text-gray-300">{item.count} SAV</div>
                    </div>
                    {barHeight > 15 && (
                      <div className="absolute top-2 left-0 right-0 text-center text-xs font-semibold text-white">
                        {formatDays(item.medianTime)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600 text-center whitespace-nowrap">
                  {item.month}
                </div>
                <div className="text-xs text-gray-400 text-center">
                  ({item.count})
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-gray-600 border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>≤ 2 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>2-5 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>5-10 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>&gt; 10 jours</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Temps médian de résolution par mois (nombre de SAV terminés)
      </p>
    </div>
  );
};
