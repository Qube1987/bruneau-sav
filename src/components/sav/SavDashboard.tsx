import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target,
  Activity,
  BarChart3
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResolutionTimeStats } from './ResolutionTimeStats';
import { ResolutionTrendChart } from './ResolutionTrendChart';

interface ResolutionTimeStatsData {
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
  resolutionTimeStats: ResolutionTimeStatsData;
  monthlyResolutionTrend: MonthlyResolution[];
}

interface SavDashboardProps {
  statistics: SavStatistics;
  loading?: boolean;
}

export const SavDashboard: React.FC<SavDashboardProps> = ({ statistics, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const weekStart = format(startOfWeek(new Date(), { locale: fr }), 'dd MMM', { locale: fr });
  const weekEnd = format(endOfWeek(new Date(), { locale: fr }), 'dd MMM', { locale: fr });

  const weeklyChange = statistics.completedLastWeek > 0
    ? ((statistics.completedThisWeek - statistics.completedLastWeek) / statistics.completedLastWeek) * 100
    : 0;

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    trendLabel?: string;
    color: string;
  }> = ({ title, value, icon, trend, trendLabel, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            <span className="font-medium">{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      {trendLabel && (
        <p className="text-xs text-gray-500 mt-2">{trendLabel}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord SAV</h2>
        <div className="text-sm text-gray-500">
          Semaine du {weekStart} au {weekEnd}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="SAV actifs"
          value={statistics.activeSavCount}
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          color="bg-blue-100"
        />

        <StatCard
          title="Temps médian de résolution"
          value={`${statistics.resolutionTimeStats.medianTime.toFixed(1)}j`}
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          color="bg-orange-100"
        />

        <StatCard
          title="SAV traités cette semaine"
          value={statistics.completedThisWeek}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          trend={weeklyChange}
          trendLabel="vs semaine dernière"
          color="bg-green-100"
        />

        <StatCard
          title="Temps de réponse moyen"
          value={`${statistics.avgResponseTime.toFixed(1)}j`}
          icon={<Target className="w-5 h-5 text-purple-600" />}
          color="bg-purple-100"
        />
      </div>

      <ResolutionTimeStats stats={statistics.resolutionTimeStats} />

      <ResolutionTrendChart data={statistics.monthlyResolutionTrend} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Répartition par statut</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Nouvelles demandes</span>
                <span className="text-sm font-bold text-yellow-600">{statistics.statusDistribution.nouvelle}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(statistics.statusDistribution.nouvelle / statistics.activeSavCount * 100) || 0}%`
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">En cours</span>
                <span className="text-sm font-bold text-blue-600">{statistics.statusDistribution.en_cours}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(statistics.statusDistribution.en_cours / statistics.activeSavCount * 100) || 0}%`
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Terminées</span>
                <span className="text-sm font-bold text-green-600">{statistics.statusDistribution.terminee}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(statistics.statusDistribution.terminee / (statistics.activeSavCount + statistics.completedThisWeek) * 100) || 0}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Indicateurs de performance</h3>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">SAV prioritaires</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{statistics.priorityDistribution.high}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-blue-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Interventions rapides</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{statistics.quickInterventionRate.toFixed(0)}%</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-700">Taux de complétion</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {((statistics.completedThisWeek / (statistics.activeSavCount + statistics.completedThisWeek)) * 100 || 0).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance par technicien (cette semaine)</h3>
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technicien
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SAV traités
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temps moyen de résolution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statistics.technicianStats.length > 0 ? (
                statistics.technicianStats.map((tech, index) => {
                  const performance = tech.avgResolutionTime <= statistics.avgResolutionTime ? 'good' : 'needs-improvement';
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {tech.technicianName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{tech.technicianName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-semibold">{tech.savCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{tech.avgResolutionTime.toFixed(1)} jours</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          performance === 'good'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {performance === 'good' ? 'Excellent' : 'À améliorer'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucune donnée disponible pour cette période
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Objectifs d'amélioration continue</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Réduire le temps moyen de résolution à moins de 3 jours</li>
                <li>Augmenter le taux d'interventions rapides à 80%</li>
                <li>Maintenir un temps de réponse moyen inférieur à 1 jour</li>
                <li>Équilibrer la charge de travail entre techniciens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
