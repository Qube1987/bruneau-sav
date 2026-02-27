import React from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MaintenanceFilters as MaintenanceFiltersType, SYSTEM_TYPES } from '../../types';

interface MaintenanceFiltersProps {
  filters: MaintenanceFiltersType;
  onFiltersChange: (filters: MaintenanceFiltersType) => void;
  users: Array<{ id: string; display_name: string | null; email: string; phone: string | null }>;
  cities: string[];
}

export const MaintenanceFilters: React.FC<MaintenanceFiltersProps> = ({
  filters,
  onFiltersChange,
  users,
  cities
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const updateFilter = (key: keyof MaintenanceFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      sort: 'client_name',
      order: 'asc'
    });
  };

  const hasActiveFilters = Object.keys(filters).some(key => 
    key !== 'sort' && key !== 'order' && filters[key as keyof MaintenanceFiltersType]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Search and Filter Toggle */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom de client ou ville..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={filters.q || ''}
            onChange={(e) => updateFilter('q', e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center px-4 py-3 border rounded-lg font-medium transition-colors flex-shrink-0 ${
            showAdvancedFilters || hasActiveFilters
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-5 w-5 mr-2" />
          {showAdvancedFilters ? (
            <ChevronUp className="h-4 w-4 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-2" />
          )}
          {hasActiveFilters && !showAdvancedFilters && (
            <span className="ml-2 bg-accent-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              !
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters - Collapsible */}
      {showAdvancedFilters && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utilisateur assigné
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de système
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="a_realiser">À réaliser</option>
                <option value="prevue">Prévue</option>
                <option value="realisee">Réalisée</option>
              </select>
            </div>
          </div>

          {/* Priority & Sort Options */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                  checked={filters.priority === true}
                  onChange={(e) => updateFilter('priority', e.target.checked ? true : undefined)}
                />
                <span className="ml-2 text-sm text-gray-700">Prioritaire seulement</span>
              </label>
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Trier par:</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  value={filters.sort || 'client_name'}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                >
                  <option value="client_name">Nom du client</option>
                  <option value="city_derived">Ville</option>
                  <option value="assigned_user_id">Utilisateur assigné</option>
                  <option value="battery_installation_year">Année batteries</option>
                  <option value="created_at">Date de création</option>
                </select>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  value={filters.order || 'asc'}
                  onChange={(e) => updateFilter('order', e.target.value as 'asc' | 'desc')}
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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