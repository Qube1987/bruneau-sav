import React from 'react';
import { MaintenanceContract } from '../../types';
import { FileText, Clock, CheckCircle, TrendingUp, Target } from 'lucide-react';

interface MaintenanceStatsProps {
  contracts: MaintenanceContract[];
}

export const MaintenanceStats: React.FC<MaintenanceStatsProps> = ({ contracts }) => {
  const totalContracts = contracts.length;
  const toRealize = contracts.filter(c => c.status === 'a_realiser').length;
  const scheduled = contracts.filter(c => c.status === 'prevue').length;
  const completed = contracts.filter(c => c.status === 'realisee').length;

  const progressPercentage = totalContracts > 0 ? Math.round((completed / totalContracts) * 100) : 0;

  // Calculate new contracts for the current year (2026)
  const currentYear = new Date().getFullYear();
  const newContractsThisYear = contracts.filter(c => {
    const createdYear = new Date(c.created_at).getFullYear();
    return createdYear === currentYear;
  });

  const totalAmountThisYear = newContractsThisYear.reduce((sum, contract) => {
    return sum + (contract.annual_amount || 0);
  }, 0);

  const yearlyGoal = 20000; // Objectif de nouveaux contrats pour l'année
  const goalPercentage = Math.min(Math.round((totalAmountThisYear / yearlyGoal) * 100), 100);
  const remainingAmount = Math.max(yearlyGoal - totalAmountThisYear, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de maintenance</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {/* Total Contracts */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-3">
            <FileText className="h-6 w-6 text-primary-600" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{totalContracts}</div>
          <div className="text-xs md:text-sm text-gray-600">Contrats total</div>
        </div>

        {/* To Realize */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-3">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-red-600">{toRealize}</div>
          <div className="text-xs md:text-sm text-gray-600">À réaliser</div>
        </div>

        {/* Scheduled */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-orange-600">{scheduled}</div>
          <div className="text-xs md:text-sm text-gray-600">Prévues</div>
        </div>

        {/* Completed */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-600">{completed}</div>
          <div className="text-xs md:text-sm text-gray-600">Réalisées</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Avancement global</span>
          <span className="text-sm font-medium text-gray-900">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Yearly Goal Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Objectif {currentYear}</h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Nouveaux contrats</div>
            <div className="text-sm font-medium text-gray-900">{newContractsThisYear.length} contrat{newContractsThisYear.length > 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-900">{totalAmountThisYear.toLocaleString('fr-FR')} €</div>
            <div className="text-xs text-blue-700">Réalisé</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{yearlyGoal.toLocaleString('fr-FR')} €</div>
            <div className="text-xs text-gray-700">Objectif</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-900">{remainingAmount.toLocaleString('fr-FR')} €</div>
            <div className="text-xs text-orange-700">Restant</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression vers l'objectif</span>
          <span className="text-sm font-bold text-blue-900">{goalPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-300 ${
              goalPercentage >= 100
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : goalPercentage >= 75
                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                : goalPercentage >= 50
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                : 'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}
            style={{ width: `${goalPercentage}%` }}
          ></div>
        </div>
        {goalPercentage >= 100 && (
          <div className="mt-2 text-center text-sm font-medium text-green-600">
            🎉 Objectif atteint !
          </div>
        )}
      </div>
    </div>
  );
};