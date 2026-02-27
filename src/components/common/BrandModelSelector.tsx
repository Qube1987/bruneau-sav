import React, { useState, useEffect } from 'react';
import { useSystemBrands } from '../../hooks/useSystemBrands';

interface BrandModelSelectorProps {
  brandValue: string;
  modelValue: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  brandError?: string;
  modelError?: string;
}

export const BrandModelSelector: React.FC<BrandModelSelectorProps> = ({
  brandValue,
  modelValue,
  onBrandChange,
  onModelChange,
  brandError,
  modelError
}) => {
  const { getAllBrands, getModelsForBrand, addCustomBrand, error: brandError2 } = useSystemBrands();
  const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
  const [customBrandName, setCustomBrandName] = useState('');
  const [showCustomModelInput, setShowCustomModelInput] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  useEffect(() => {
    if (brandValue && brandValue !== 'Autre') {
      const models = getModelsForBrand(brandValue);
      setAvailableModels(models);

      if (!models) {
        setShowCustomModelInput(true);
      } else {
        if (modelValue === 'Autre' || !models.includes(modelValue)) {
          setShowCustomModelInput(modelValue === 'Autre');
        }
      }
    } else {
      setAvailableModels(null);
      setShowCustomModelInput(false);
    }
  }, [brandValue, getModelsForBrand]);

  const handleBrandChange = (value: string) => {
    if (value === 'Autre') {
      setShowCustomBrandInput(true);
      onBrandChange('');
      onModelChange('');
    } else {
      setShowCustomBrandInput(false);
      onBrandChange(value);

      const models = getModelsForBrand(value);
      setAvailableModels(models);

      if (!models) {
        onModelChange('');
        setShowCustomModelInput(true);
      } else {
        onModelChange('');
        setShowCustomModelInput(false);
      }
    }
  };

  const handleModelChange = (value: string) => {
    if (value === 'Autre') {
      setShowCustomModelInput(true);
      setCustomModelName('');
      onModelChange('');
    } else {
      setShowCustomModelInput(false);
      onModelChange(value);
    }
  };

  const handleAddCustomBrand = async () => {
    if (!customBrandName.trim()) {
      alert('Veuillez saisir un nom de marque');
      return;
    }

    setIsAddingBrand(true);
    try {
      const success = await addCustomBrand(customBrandName.trim());
      if (success) {
        onBrandChange(customBrandName.trim());
        setShowCustomBrandInput(false);
        setCustomBrandName('');
        setShowCustomModelInput(true);
      }
    } finally {
      setIsAddingBrand(false);
    }
  };

  const handleBrandKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomBrand();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Marque du système
        </label>
        {!showCustomBrandInput ? (
          <select
            value={brandValue}
            onChange={(e) => handleBrandChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              brandError ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionner une marque</option>
            {getAllBrands().map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={customBrandName}
                onChange={(e) => setCustomBrandName(e.target.value)}
                onKeyPress={handleBrandKeyPress}
                placeholder="Nom de la marque"
                disabled={isAddingBrand}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomBrand}
                disabled={isAddingBrand || !customBrandName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isAddingBrand ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomBrandInput(false);
                  setCustomBrandName('');
                }}
                disabled={isAddingBrand}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
              >
                Annuler
              </button>
            </div>
            {brandError2 && (
              <p className="text-sm text-red-600">{brandError2}</p>
            )}
          </div>
        )}
        {brandError && (
          <p className="text-sm text-red-600 mt-1">{brandError}</p>
        )}
      </div>

      {brandValue && !showCustomBrandInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Modèle du système
          </label>
          {availableModels && availableModels.length > 0 ? (
            !showCustomModelInput ? (
              <select
                value={modelValue}
                onChange={(e) => handleModelChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  modelError ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner un modèle</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                <option value="Autre">Autre</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customModelName || modelValue}
                  onChange={(e) => {
                    setCustomModelName(e.target.value);
                    onModelChange(e.target.value);
                  }}
                  placeholder="Nom du modèle"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomModelInput(false);
                    setCustomModelName('');
                    onModelChange('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            )
          ) : (
            <input
              type="text"
              value={modelValue}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="Saisir le modèle"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                modelError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          )}
          {modelError && (
            <p className="text-sm text-red-600 mt-1">{modelError}</p>
          )}
        </div>
      )}
    </div>
  );
};
