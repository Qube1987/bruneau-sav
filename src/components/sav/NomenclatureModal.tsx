import React, { useState, useEffect } from 'react';
import { X, Loader, Package } from 'lucide-react';
import { useExtrabat } from '../../hooks/useExtrabat';

interface NomenclatureModalProps {
  extrabatId: number;
  ouvrageId: number;
  clientName: string;
  ouvrageLibelle?: string;
  onClose: () => void;
}

interface Article {
  id: number;
  libelle: string;
  code: string;
  quantite: string;
  unite: { libelle: string };
  dateMiseADispo?: string;
}

export const NomenclatureModal: React.FC<NomenclatureModalProps> = ({
  extrabatId,
  ouvrageId,
  clientName,
  ouvrageLibelle,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { getClientData } = useExtrabat();

  useEffect(() => {
    const fetchNomenclature = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getClientData(extrabatId);

        if (!result.success || !result.data) {
          setError(result.error || 'Erreur lors de la récupération des données');
          return;
        }

        const clientData = result.data;

        const ouvrage = clientData.ouvrage?.find((o: any) => o.id === ouvrageId);

        if (!ouvrage) {
          setError('Ouvrage non trouvé');
          return;
        }

        const allArticles: Article[] = [];

        if (ouvrage.equipements && Array.isArray(ouvrage.equipements)) {
          ouvrage.equipements.forEach((equipement: any) => {
            if (equipement.article) {
              allArticles.push({
                id: equipement.article.id,
                libelle: equipement.article.libelle,
                code: equipement.article.code,
                quantite: equipement.quantite,
                unite: equipement.article.unite,
                dateMiseADispo: equipement.dateMiseADispo
              });
            }
          });
        }

        if (ouvrage.accessoires && Array.isArray(ouvrage.accessoires)) {
          ouvrage.accessoires.forEach((accessoire: any) => {
            if (accessoire.article) {
              allArticles.push({
                id: accessoire.article.id,
                libelle: accessoire.article.libelle,
                code: accessoire.article.code,
                quantite: accessoire.quantite,
                unite: accessoire.article.unite,
                dateMiseADispo: accessoire.dateMiseADispo
              });
            }
          });
        }

        setArticles(allArticles);
      } catch (err: any) {
        console.error('Error fetching nomenclature:', err);
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchNomenclature();
  }, [extrabatId, ouvrageId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white sm:rounded-lg shadow-xl sm:max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Nomenclature - {clientName}
            </h2>
            {ouvrageLibelle && (
              <p className="text-sm text-gray-600 mt-1">{ouvrageLibelle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Chargement de la nomenclature...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Aucun article trouvé pour cet ouvrage</p>
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Désignation
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de mise à dispo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {articles.map((article) => {
                    const quantite = parseFloat(article.quantite) || 0;
                    const dateFormatted = article.dateMiseADispo
                      ? new Date(article.dateMiseADispo).toLocaleDateString('fr-FR')
                      : '-';

                    return (
                      <tr key={article.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {article.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {article.libelle}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {quantite.toFixed(2)} {article.unite?.libelle || ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {dateFormatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t shrink-0 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors min-h-[44px]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
