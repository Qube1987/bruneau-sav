# Guide d'intégration - Sélecteur de date et heure d'intervention

Ce document décrit comment implémenter un sélecteur de date et heure avec arrondi automatique et auto-complétion pour les interventions.

## Vue d'ensemble

Le système est composé de :
- **TimeSelector** : Composant réutilisable pour sélectionner date + heure + minutes
- **Arrondi automatique** : Arrondit les heures au quart d'heure le plus proche (0, 15, 30, 45 min)
- **Auto-complétion** : Calcule automatiquement l'heure de fin (+1h par défaut)
- **Gestion de formulaire** : Intégration avec react-hook-form et yup

## Dépendances nécessaires

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-hook-form": "^7.62.0",
    "@hookform/resolvers": "^5.2.1",
    "yup": "^1.7.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.344.0"
  }
}
```

Installation :
```bash
npm install react-hook-form @hookform/resolvers yup date-fns lucide-react
```

## Architecture des composants

```
┌─────────────────────────────────────┐
│  InterventionForm                   │
│  (Formulaire principal)             │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ TimeSelector                  │ │
│  │ (Composant réutilisable)      │ │
│  │                               │ │
│  │  [Date] [Heure] [Minutes]     │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ TimeSelector                  │ │
│  │  [Date] [Heure] [Minutes]     │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 1. Composant TimeSelector

### Fichier : `components/common/TimeSelector.tsx`

```typescript
import React from 'react';
import { Calendar } from 'lucide-react';

interface TimeSelectorProps {
  label: string;                    // Titre du champ
  value: string;                    // Valeur au format "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;// Callback lors du changement
  required?: boolean;               // Champ obligatoire
  error?: string;                   // Message d'erreur
  icon?: React.ReactNode;           // Icône personnalisée
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
  label,
  value,
  onChange,
  required = false,
  error,
  icon = <Calendar className="h-4 w-4 inline mr-2" />
}) => {
  // Parse la valeur actuelle au format ISO 8601
  const parseDateTime = (dateTimeString: string) => {
    if (!dateTimeString) {
      const now = new Date();
      return {
        date: now.toISOString().split('T')[0],
        hours: now.getHours().toString().padStart(2, '0'),
        minutes: '00'
      };
    }

    const [date, time] = dateTimeString.split('T');
    const [hours, minutes] = time ? time.split(':') : ['00', '00'];

    return {
      date: date || new Date().toISOString().split('T')[0],
      hours: hours || '00',
      minutes: minutes || '00'
    };
  };

  const { date, hours, minutes } = parseDateTime(value);

  // Reconstruit la valeur complète quand un champ change
  const handleChange = (newDate: string, newHours: string, newMinutes: string) => {
    const newValue = `${newDate}T${newHours}:${newMinutes}`;
    onChange(newValue);
  };

  // Génère les options d'heures (00-23)
  const hoursOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  // Génère les options de minutes (00, 15, 30, 45)
  const minutesOptions = ['00', '15', '30', '45'];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {icon}
        {label} {required && '*'}
      </label>

      <div className="grid grid-cols-3 gap-2">
        {/* Input Date */}
        <div className="col-span-1">
          <input
            type="date"
            value={date}
            onChange={(e) => handleChange(e.target.value, hours, minutes)}
            className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
          />
        </div>

        {/* Select Heures */}
        <div className="col-span-1">
          <select
            value={hours}
            onChange={(e) => handleChange(date, e.target.value, minutes)}
            className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
          >
            {hoursOptions.map(hour => (
              <option key={hour} value={hour}>{hour}h</option>
            ))}
          </select>
        </div>

        {/* Select Minutes */}
        <div className="col-span-1">
          <select
            value={minutes}
            onChange={(e) => handleChange(date, hours, e.target.value)}
            className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
              error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
          >
            {minutesOptions.map(minute => (
              <option key={minute} value={minute}>{minute}min</option>
            ))}
          </select>
        </div>
      </div>

      {/* Affichage erreur */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
```

### Fonctionnalités du composant

1. **Parsing automatique** : Convertit la valeur ISO 8601 en date/heure/minutes séparés
2. **3 champs distincts** : Date (input date), Heures (select 00-23), Minutes (select 00/15/30/45)
3. **Format de sortie standardisé** : Toujours `YYYY-MM-DDTHH:mm`
4. **Gestion d'erreurs** : Affiche un message et change la couleur de la bordure
5. **Icône personnalisable** : Par défaut un calendrier

## 2. Fonctions utilitaires pour l'arrondi

### Fichier : `utils/dateHelpers.ts` (optionnel)

```typescript
import { format, setMinutes, setSeconds } from 'date-fns';

/**
 * Arrondit une date au quart d'heure le plus proche
 */
export const roundToNearest15Minutes = (date: Date): Date => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  return setSeconds(setMinutes(date, roundedMinutes), 0);
};

/**
 * Formate une date ISO pour l'input datetime (format "YYYY-MM-DDTHH:mm")
 */
export const formatDateTimeForInput = (dateString: string): string => {
  const date = new Date(dateString);
  const roundedDate = roundToNearest15Minutes(date);
  return format(roundedDate, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Ajoute une durée (en millisecondes) à une date et l'arrondit
 */
export const addDurationAndRound = (dateString: string, durationMs: number): string => {
  const startDate = new Date(dateString);
  const endDate = new Date(startDate.getTime() + durationMs);
  const roundedEndDate = roundToNearest15Minutes(endDate);
  return format(roundedEndDate, "yyyy-MM-dd'T'HH:mm");
};
```

## 3. Schéma de validation Yup

```typescript
import * as yup from 'yup';

const interventionSchema = yup.object({
  started_at: yup
    .string()
    .required('La date de début est obligatoire'),
  ended_at: yup
    .string()
    .test('is-after-start', 'La date de fin doit être après la date de début', function(value) {
      const { started_at } = this.parent;
      if (!value || !started_at) return true;
      return new Date(value) > new Date(started_at);
    }),
  technician_ids: yup
    .array()
    .of(yup.string().required())
    .default([]),
  notes: yup.string()
});

type InterventionFormData = yup.InferType<typeof interventionSchema>;
```

## 4. Formulaire d'intervention complet

### Fichier : `components/InterventionForm.tsx`

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Calendar, Save, X, User } from 'lucide-react';
import { format, setMinutes, setSeconds } from 'date-fns';
import { TimeSelector } from './common/TimeSelector';

// Schéma de validation
const schema = yup.object({
  started_at: yup.string().required('La date de début est obligatoire'),
  ended_at: yup.string(),
  technician_ids: yup.array().of(yup.string().required()).default([]),
  notes: yup.string()
});

type FormData = yup.InferType<typeof schema>;

interface InterventionFormProps {
  users: Array<{ id: string; display_name: string; email: string }>;
  intervention?: {
    started_at: string;
    ended_at?: string;
    technician_ids: string[];
    notes?: string;
  };
  onSubmit: (data: FormData & { technician_ids: string[] }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const InterventionForm: React.FC<InterventionFormProps> = ({
  users,
  intervention,
  onSubmit,
  onCancel,
  loading = false
}) => {
  // Fonction pour arrondir au quart d'heure
  const roundToNearest15Minutes = (date: Date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return setSeconds(setMinutes(date, roundedMinutes), 0);
  };

  // Fonction pour formater une date
  const formatDateTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    const roundedDate = roundToNearest15Minutes(date);
    return format(roundedDate, "yyyy-MM-dd'T'HH:mm");
  };

  // État local pour les techniciens sélectionnés
  const [selectedTechnicians, setSelectedTechnicians] = React.useState<string[]>(
    intervention?.technician_ids || []
  );

  // Configuration du formulaire
  const {
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      started_at: intervention
        ? formatDateTimeForInput(intervention.started_at)
        : format(roundToNearest15Minutes(new Date()), "yyyy-MM-dd'T'HH:mm"),
      ended_at: intervention?.ended_at
        ? formatDateTimeForInput(intervention.ended_at)
        : '',
      notes: intervention?.notes || ''
    }
  });

  // Watch l'heure de début pour auto-remplir l'heure de fin
  const startedAt = watch('started_at');

  React.useEffect(() => {
    // Auto-remplissage uniquement pour les nouvelles interventions
    if (startedAt && !intervention) {
      const startDate = new Date(startedAt);

      if (!isNaN(startDate.getTime())) {
        // Ajouter 1 heure par défaut
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const roundedEndDate = roundToNearest15Minutes(endDate);
        const formattedEndDate = format(roundedEndDate, "yyyy-MM-dd'T'HH:mm");

        setValue('ended_at', formattedEndDate);
      }
    }
  }, [startedAt, setValue, intervention]);

  // Toggle sélection technicien
  const toggleTechnician = (technicianId: string) => {
    setSelectedTechnicians(prev =>
      prev.includes(technicianId)
        ? prev.filter(id => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  // Soumission du formulaire
  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      technician_ids: selectedTechnicians
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {intervention ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">

          {/* Sélection des techniciens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <User className="h-4 w-4 inline mr-2" />
              Intervenants
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTechnicians.includes(user.id)}
                    onChange={() => toggleTechnician(user.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {user.display_name || user.email}
                  </span>
                </label>
              ))}
            </div>
            {selectedTechnicians.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                Aucun intervenant sélectionné
              </p>
            )}
          </div>

          {/* Dates et heures */}
          <div className="space-y-6">
            <TimeSelector
              label="Date et heure de début"
              value={watch('started_at')}
              onChange={(value) => setValue('started_at', value)}
              required
              error={errors.started_at?.message}
              icon={<Calendar className="h-4 w-4 inline mr-2" />}
            />

            <TimeSelector
              label="Date et heure de fin"
              value={watch('ended_at')}
              onChange={(value) => setValue('ended_at', value)}
              icon={<Calendar className="h-4 w-4 inline mr-2" />}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes d'intervention
            </label>
            <textarea
              value={watch('notes')}
              onChange={(e) => setValue('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Décrivez les actions réalisées, les observations, etc."
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>{intervention ? 'Mettre à jour' : 'Créer l\'intervention'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## 5. Utilisation du formulaire

```typescript
import React from 'react';
import { InterventionForm } from './components/InterventionForm';

function App() {
  const [showForm, setShowForm] = React.useState(false);

  const users = [
    { id: '1', display_name: 'Paul Dupont', email: 'paul@example.com' },
    { id: '2', display_name: 'Quentin Martin', email: 'quentin@example.com' },
    { id: '3', display_name: 'Téo Bernard', email: 'teo@example.com' }
  ];

  const handleSubmit = (data) => {
    console.log('Données du formulaire:', data);
    // Format des données:
    // {
    //   started_at: "2026-01-26T11:30",
    //   ended_at: "2026-01-26T12:30",
    //   technician_ids: ["1", "2"],
    //   notes: "Notes de l'intervention"
    // }

    // Enregistrer dans la base de données
    setShowForm(false);
  };

  return (
    <div>
      <button onClick={() => setShowForm(true)}>
        Créer une intervention
      </button>

      {showForm && (
        <InterventionForm
          users={users}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
```

## 6. Format des données

### Input (valeur attendue)
```typescript
"2026-01-26T11:30"  // Format ISO 8601 simplifié
```

### Output (valeur retournée)
```typescript
{
  started_at: "2026-01-26T11:30",
  ended_at: "2026-01-26T12:30",
  technician_ids: ["uuid-1", "uuid-2"],
  notes: "Notes..."
}
```

### Conversion pour la base de données
```typescript
// Pour stocker en base (PostgreSQL timestamptz)
const startedAtISO = `${data.started_at}:00Z`;  // Ajouter secondes et timezone
// Résultat: "2026-01-26T11:30:00Z"

// Pour afficher (depuis la base)
const date = new Date(intervention.started_at);
const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
// Résultat: "2026-01-26T11:30"
```

## 7. Personnalisation

### Changer les intervalles de minutes

Par défaut : 00, 15, 30, 45

Pour des intervalles de 10 minutes :
```typescript
const minutesOptions = ['00', '10', '20', '30', '40', '50'];
```

Pour des intervalles de 5 minutes :
```typescript
const minutesOptions = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, '0')
);
// Résultat: ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
```

### Changer la durée par défaut

Par défaut : +1 heure

Pour +2 heures :
```typescript
const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
```

Pour +30 minutes :
```typescript
const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
```

### Limiter les heures disponibles

Pour limiter de 8h à 18h uniquement :
```typescript
const hoursOptions = Array.from({ length: 11 }, (_, i) =>
  (i + 8).toString().padStart(2, '0')
);
// Résultat: ['08', '09', '10', ... '18']
```

## 8. Intégration avec Supabase

### Schéma de table

```sql
CREATE TABLE interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE intervention_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES interventions(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
```

### Insertion des données

```typescript
import { supabase } from './lib/supabase';

const createIntervention = async (data: FormData) => {
  // 1. Créer l'intervention
  const { data: intervention, error } = await supabase
    .from('interventions')
    .insert({
      started_at: `${data.started_at}:00Z`,
      ended_at: data.ended_at ? `${data.ended_at}:00Z` : null,
      notes: data.notes || null
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Créer les liens techniciens
  if (data.technician_ids.length > 0) {
    const technicianLinks = data.technician_ids.map(techId => ({
      intervention_id: intervention.id,
      technician_id: techId
    }));

    const { error: linkError } = await supabase
      .from('intervention_technicians')
      .insert(technicianLinks);

    if (linkError) throw linkError;
  }

  return intervention;
};
```

### Récupération des données

```typescript
const getInterventions = async () => {
  const { data, error } = await supabase
    .from('interventions')
    .select(`
      *,
      technicians:intervention_technicians(
        technician:technician_id(id, display_name, email)
      )
    `)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data;
};
```

## 9. Gestion des cas particuliers

### Interventions sur plusieurs jours

```typescript
// Exemple: Intervention du 26/01 14h au 27/01 9h
{
  started_at: "2026-01-26T14:00",
  ended_at: "2026-01-27T09:00"
}
```

### Interventions sans heure de fin

Laissez `ended_at` vide ou null :
```typescript
{
  started_at: "2026-01-26T11:30",
  ended_at: ""  // ou null
}
```

### Désactiver l'auto-complétion

Ajoutez une condition :
```typescript
React.useEffect(() => {
  // Ne pas auto-remplir si l'utilisateur a déjà modifié ended_at
  const endedAt = watch('ended_at');

  if (startedAt && !intervention && !endedAt) {
    // Auto-remplissage...
  }
}, [startedAt, setValue, intervention, watch('ended_at')]);
```

## 10. Accessibilité

Le composant respecte les bonnes pratiques d'accessibilité :

- Labels explicites avec `<label>`
- Champs obligatoires marqués avec `*`
- Messages d'erreur associés aux champs
- Navigation au clavier fonctionnelle
- Couleurs contrastées pour les erreurs

### Améliorations possibles

```typescript
// Ajouter des attributs ARIA
<input
  type="date"
  aria-label="Date de l'intervention"
  aria-required={required}
  aria-invalid={!!error}
  aria-describedby={error ? `${id}-error` : undefined}
/>

{error && (
  <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
    {error}
  </p>
)}
```

## 11. Tests

### Test unitaire du composant TimeSelector

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSelector } from './TimeSelector';

test('change date updates value', () => {
  const handleChange = jest.fn();

  render(
    <TimeSelector
      label="Date de début"
      value="2026-01-26T11:30"
      onChange={handleChange}
    />
  );

  const dateInput = screen.getByDisplayValue('2026-01-26');
  fireEvent.change(dateInput, { target: { value: '2026-01-27' } });

  expect(handleChange).toHaveBeenCalledWith('2026-01-27T11:30');
});

test('displays error message', () => {
  render(
    <TimeSelector
      label="Date de début"
      value="2026-01-26T11:30"
      onChange={() => {}}
      error="Ce champ est obligatoire"
    />
  );

  expect(screen.getByText('Ce champ est obligatoire')).toBeInTheDocument();
});
```

## 12. Styles Tailwind CSS

Le composant utilise Tailwind CSS. Si vous n'utilisez pas Tailwind, voici les équivalents CSS :

```css
/* .border-gray-300 */
border: 1px solid #d1d5db;

/* .rounded-lg */
border-radius: 0.5rem;

/* .focus:ring-2 */
outline: 2px solid transparent;
box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);

/* .px-3 py-3 */
padding: 0.75rem;

/* .text-sm */
font-size: 0.875rem;

/* .font-medium */
font-weight: 500;

/* .text-red-600 */
color: #dc2626;
```

## 13. Résumé des points clés

✅ **Arrondi automatique** : Les heures sont arrondies au quart d'heure le plus proche
✅ **Auto-complétion** : L'heure de fin est calculée automatiquement (+1h)
✅ **Validation** : Intégration avec react-hook-form et yup
✅ **Multi-techniciens** : Support de plusieurs intervenants par intervention
✅ **Format standardisé** : ISO 8601 (`YYYY-MM-DDTHH:mm`)
✅ **Réutilisable** : Composant TimeSelector autonome
✅ **Personnalisable** : Intervalles, durée, heures configurables

## 14. Checklist d'implémentation

- [ ] Installer les dépendances (react-hook-form, yup, date-fns, lucide-react)
- [ ] Créer le composant TimeSelector
- [ ] Créer les fonctions d'arrondi (roundToNearest15Minutes)
- [ ] Créer le schéma de validation Yup
- [ ] Créer le formulaire d'intervention
- [ ] Implémenter l'auto-complétion de l'heure de fin
- [ ] Ajouter la sélection multiple de techniciens
- [ ] Tester le composant avec des données réelles
- [ ] Intégrer avec la base de données
- [ ] Ajouter la gestion d'erreurs

## Support

Pour toute question ou problème d'implémentation, vérifiez :
- Les versions des dépendances
- Les formats de date (ISO 8601)
- Les schémas de validation Yup
- Les console.log pour déboguer les valeurs

## Conclusion

Ce système de sélection de date et heure offre une expérience utilisateur optimale pour la planification d'interventions :
- Interface intuitive (3 champs séparés)
- Arrondi intelligent (quarts d'heure)
- Gain de temps (auto-complétion)
- Validation robuste (yup)
- Entièrement réutilisable

Le code est prêt à être intégré dans n'importe quelle application React moderne.
