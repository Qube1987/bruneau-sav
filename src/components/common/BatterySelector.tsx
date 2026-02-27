import React, { useState, useEffect } from 'react';
import { Battery, Plus, Trash2, X } from 'lucide-react';
import { useBatteries, BatterySelection } from '../../hooks/useBatteries';

interface BatterySelectorProps {
  interventionId?: string;
  interventionType: 'sav' | 'maintenance';
  onBatteriesChange: (batteries: BatterySelection[], hasBatteryChange: boolean) => void;
  initialBatteries?: BatterySelection[];
  initialHasBatteryChange?: boolean;
}

export const BatterySelector: React.FC<BatterySelectorProps> = ({
  interventionId,
  interventionType,
  onBatteriesChange,
  initialBatteries = [],
  initialHasBatteryChange = false
}) => {
  const { batteryProducts, loading, fetchInterventionBatteries } = useBatteries();
  const [isOpen, setIsOpen] = useState(initialHasBatteryChange);
  const [selectedBatteries, setSelectedBatteries] = useState<BatterySelection[]>(initialBatteries);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (interventionId) {
      loadInterventionBatteries();
    }
  }, [interventionId]);

  useEffect(() => {
    onBatteriesChange(selectedBatteries, isOpen);
  }, [selectedBatteries, isOpen]);

  const loadInterventionBatteries = async () => {
    if (!interventionId) return;

    try {
      const batteries = await fetchInterventionBatteries(interventionId, interventionType);
      const selections: BatterySelection[] = batteries.map(b => ({
        battery_product_id: b.battery_product_id,
        quantity: b.quantity,
        unit_price: b.unit_price
      }));
      setSelectedBatteries(selections);
    } catch (error) {
      console.error('Error loading batteries:', error);
    }
  };

  const handleAddBattery = () => {
    if (!selectedProductId || quantity <= 0) return;

    const product = batteryProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = selectedBatteries.findIndex(
      b => b.battery_product_id === selectedProductId
    );

    if (existingIndex >= 0) {
      const updated = [...selectedBatteries];
      updated[existingIndex].quantity += quantity;
      setSelectedBatteries(updated);
    } else {
      setSelectedBatteries([
        ...selectedBatteries,
        {
          battery_product_id: selectedProductId,
          quantity: quantity,
          unit_price: product.unit_price
        }
      ]);
    }

    setSelectedProductId('');
    setQuantity(1);
    setShowAddForm(false);
  };

  const handleRemoveBattery = (batteryProductId: string) => {
    setSelectedBatteries(selectedBatteries.filter(b => b.battery_product_id !== batteryProductId));
  };

  const handleUpdateQuantity = (batteryProductId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveBattery(batteryProductId);
      return;
    }

    setSelectedBatteries(
      selectedBatteries.map(b =>
        b.battery_product_id === batteryProductId
          ? { ...b, quantity: newQuantity }
          : b
      )
    );
  };

  const getBatteryName = (batteryProductId: string) => {
    return batteryProducts.find(p => p.id === batteryProductId)?.name || 'Inconnu';
  };

  const getBatteryPrice = (batteryProductId: string) => {
    return batteryProducts.find(p => p.id === batteryProductId)?.unit_price || 0;
  };

  const calculateTotal = () => {
    return selectedBatteries.reduce((total, battery) => {
      const price = getBatteryPrice(battery.battery_product_id);
      return total + (price * battery.quantity);
    }, 0);
  };

  if (loading && batteryProducts.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="battery-change"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="battery-change" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <Battery className="h-4 w-4" />
          Changement de piles/batteries
        </label>
      </div>

      {isOpen && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            {selectedBatteries.map((battery) => (
              <div
                key={battery.battery_product_id}
                className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {getBatteryName(battery.battery_product_id)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getBatteryPrice(battery.battery_product_id).toFixed(2)} € / unité
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(battery.battery_product_id, battery.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <span className="text-gray-600 font-bold">−</span>
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={battery.quantity}
                      onChange={(e) => handleUpdateQuantity(battery.battery_product_id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(battery.battery_product_id, battery.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <span className="text-gray-600 font-bold">+</span>
                    </button>
                  </div>

                  <div className="text-sm font-medium text-gray-900 min-w-[60px] text-right">
                    {(getBatteryPrice(battery.battery_product_id) * battery.quantity).toFixed(2)} €
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveBattery(battery.battery_product_id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {selectedBatteries.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Aucune pile/batterie sélectionnée
              </div>
            )}
          </div>

          {showAddForm ? (
            <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-900">Ajouter une pile/batterie</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedProductId('');
                    setQuantity(1);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produit
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner...</option>
                    {batteryProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.unit_price.toFixed(2)} €
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddBattery}
                disabled={!selectedProductId || quantity <= 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter une pile/batterie
            </button>
          )}

          {selectedBatteries.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total HT</span>
              <span className="font-bold text-lg text-gray-900">
                {calculateTotal().toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
