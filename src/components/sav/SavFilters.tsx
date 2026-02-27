import React from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { SavFilters as SavFiltersType, SYSTEM_TYPES } from '../../types';

interface SavFiltersProps {
  filters: SavFiltersType;
  onFiltersChange: (filters: SavFiltersType) => void;
  users: Array<{ id: string; display_name: string | null; email: string; phone: string | null }>;
  cities: string[];
  showBillingFilter?: boolean;
}

export const SavFilters: React.FC<SavFiltersProps> = ({
  filters,
  onFiltersChange,
  users,
  cities,
  showBillingFilter = false
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const updateFilter = (key: keyof SavFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      sort: 'requested_at',
      order: 'desc'
    });
  };

  const hasActiveFilters = Object.keys(filters).some(key => 
    key !== 'sort' && key !== 'order' && filters[key as keyof SavFiltersType]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 overflow-hidden">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom de client ou ville..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base min-w-0"
            value={filters.q || ''}
            onChange={(e) => updateFilter('q', e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center justify-center px-3 sm:px-4 py-3 border rounded-lg font-medium transition-colors flex-shrink-0 text-sm sm:text-base whitespace-nowrap ${
            showAdvancedFilters || hasActiveFilters
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">Filtres</span>
          {showAdvancedFilters ? (
            <ChevronUp className="h-4 w-4 sm:ml-2 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 sm:ml-2 ml-1" />
          )}
          {hasActiveFilters && !showAdvancedFilters && (
            <span className="ml-1 sm:ml-2 bg-accent-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              !
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters - Collapsible */}
      {showAdvancedFilters && (
        <div className="space-y-4 pt-4 border-t border-gray-200 overflow-hidden">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
                Utilisateur assigné
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm min-w-0"
                value={filters.user_id || ''}
                onChange={(e) => updateFilter('user_id', e.target.value)}
              >
                <option value="">Tous les utilisateurs</option>
                <option value="unassigned">Non assigné</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
                Ville
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm min-w-0"
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value)}
              >
                <option value="">Toutes les villes</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* System Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
                Type de système
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm min-w-0"
                value={filters.system_type || ''}
                onChange={(e) => updateFilter('system_type', e.target.value)}
              >
                <option value="">Tous les types</option>
                {Object.entries(SYSTEM_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 truncate">
                {showBillingFilter ? 'Statut de facturation' : 'Statut'}
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm min-w-0"
                value={showBillingFilter ? (filters.billing_status || '') : (filters.status || '')}
                onChange={(e) => showBillingFilter ? updateFilter('billing_status', e.target.value) : updateFilter('status', e.target.value)}
              >
                {showBillingFilter ? (
                  <>
                    <option value="to_bill">À facturer</option>
                    <option value="billed">Facturé</option>
                    <option value="all">Tous (à facturer + facturés)</option>
                  </>
                ) : (
                  <>
                    <option value="active">En cours (nouvelle + en cours)</option>
                    <option value="all">Tous</option>
                    <option value="nouvelle">Nouvelle</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminée</option>
                    <option value="archivee">Archivée</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Urgent & Sort Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                  checked={filters.urgent === true}
                  onChange={(e) => updateFilter('urgent', e.target.checked ? true : undefined)}
                />
                <span className="ml-2 text-sm text-gray-700 whitespace-nowrap">Urgent seulement</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4 min-w-0">
              {/* Sort */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-2 min-w-0">
                <label className="text-sm text-gray-700 whitespace-nowrap">Trier par:</label>
                <div className="flex gap-2">
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors flex-1 sm:flex-none min-w-0"
                    value={filters.sort || 'requested_at'}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                  >
                    <option value="requested_at">Date de demande</option>
                    <option value="client_name">Nom du client</option>
                    <option value="city_derived">Ville</option>
                    <option value="assigned_user_id">Utilisateur assigné</option>
                  </select>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors flex-1 sm:flex-none min-w-0"
                    value={filters.order || 'asc'}
                    onChange={(e) => updateFilter('order', e.target.value as 'asc' | 'desc')}
                  >
                    <option value="asc">Croissant</option>
                    <option value="desc">Décroissant</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto whitespace-nowrap"
                >
                  <X className="h-4 w-4 mr-1" />
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};