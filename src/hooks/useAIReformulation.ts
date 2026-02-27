import { useState } from 'react';

interface ReformulateResponse {
  rapport_reformule?: string;
  error?: string;
}

export const useAIReformulation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reformulateText = async (
    text: string,
    type: 'rapport' | 'description' = 'rapport'
  ): Promise<string | null> => {
    if (!text || text.trim() === '') {
      setError('Le texte est vide');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reformulate-report`;

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rapport_brut: text, type }),
      });

      const data: ReformulateResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "La reformulation n'a pas pu être effectuée. Merci de réessayer.");
      }

      return data.rapport_reformule || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "La reformulation n'a pas pu être effectuée. Merci de réessayer.";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reformulateReport = async (rapportBrut: string): Promise<string | null> => {
    return reformulateText(rapportBrut, 'rapport');
  };

  const reformulateDescription = async (description: string): Promise<string | null> => {
    return reformulateText(description, 'description');
  };

  return { reformulateReport, reformulateDescription, loading, error };
};
