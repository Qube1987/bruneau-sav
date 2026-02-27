export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'technicien';
  display_name: string | null;
  phone: string | null;
  extrabat_code: string | null;
  created_at: string;
}

export interface SavRequest {
  id: string;
  client_name: string;
  site?: string;
  client_email?: string;
  phone?: string;
  address?: string;
  city_derived?: string;
  system_type: 'ssi' | 'type4' | 'intrusion' | 'video' | 'controle_acces' | 'interphone' | 'portail' | 'autre';
  system_brand?: string;
  system_model?: string;
  problem_desc: string;
  problem_desc_reformule?: string;
  observations?: string;
  rapport_brut?: string;
  rapport_reformule?: string;
  rapport_valide_par_technicien?: boolean;
  assigned_user_id?: string;
  urgent: boolean;
  status: 'nouvelle' | 'en_cours' | 'terminee' | 'archivee';
  requested_at: string;
  resolved_at?: string;
  archived_at?: string;
  created_by: string;
  extrabat_id?: number;
  extrabat_ouvrage_id?: number;
  estimated_duration?: number;
  latitude?: number;
  longitude?: number;
  priority?: boolean;
  is_quick_intervention?: boolean;
  is_long_intervention?: boolean;
  created_at: string;
  assigned_user?: User;
  interventions?: Intervention[];
  has_maintenance_contract?: boolean;
}

export interface InterventionPhoto {
  id: string;
  intervention_id: string;
  intervention_type: 'sav' | 'maintenance';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  created_at: string;
  include_in_pdf?: boolean;
  url?: string;
}

export interface Intervention {
  id: string;
  sav_request_id: string;
  started_at: string;
  ended_at?: string;
  technician_id?: string;
  notes?: string;
  rapport_brut?: string;
  rapport_reformule?: string;
  has_battery_change?: boolean;
  created_at: string;
  technician?: User;
  technicians?: User[];
  extrabat_intervention_id?: string;
  photos?: InterventionPhoto[];
}

export interface SavFilters {
  q?: string;
  user_id?: string;
  assigned_user_id?: string;
  city?: string;
  system_type?: string;
  status?: string;
  urgent?: boolean;
  sort?: 'requested_at' | 'client_name' | 'city_derived' | 'assigned_user_id';
  order?: 'asc' | 'desc';
  billing_status?: 'to_bill' | 'billed';
}

export const SYSTEM_TYPES = {
  ssi: 'Alarme incendie type SSI',
  type4: 'Alarme évacuation type 4',
  intrusion: 'Alarme intrusion',
  video: 'Vidéosurveillance',
  controle_acces: 'Contrôle d\'accès',
  interphone: 'Interphone',
  portail: 'Portail',
  autre: 'Autre'
} as const;

export const STATUS_LABELS = {
  nouvelle: 'Nouvelle',
  en_cours: 'En cours',
  terminee: 'Terminée',
  archivee: 'Archivée'
} as const;

// Maintenance Contract Types
export interface MaintenanceContract {
  id: string;
  client_name: string;
  site?: string;
  phone?: string;
  address?: string;
  city_derived?: string;
  system_type: 'ssi' | 'type4' | 'intrusion' | 'video' | 'controle_acces' | 'interphone' | 'portail' | 'autre';
  system_brand?: string;
  system_model?: string;
  battery_installation_year: number;
  observations?: string;
  assigned_user_id?: string;
  priority: boolean;
  status: 'a_realiser' | 'prevue' | 'realisee';
  created_by: string;
  extrabat_id?: number;
  extrabat_ouvrage_id?: number;
  estimated_duration?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  assigned_user?: User;
  interventions?: MaintenanceIntervention[];
  annual_amount?: number;
  billing_mode?: 'debut_annee' | 'grenke' | 'sur_devis' | 'apres_visite';
  invoice_sent?: boolean;
  invoice_paid?: boolean;
  client_type?: 'particulier' | 'pro' | 'collectivite';
  last_year_visit_date?: string;
}

export interface MaintenanceIntervention {
  id: string;
  contract_id: string;
  scheduled_at?: string;
  completed_at?: string;
  started_at?: string;
  ended_at?: string;
  technician_id?: string;
  notes?: string;
  status: 'prevue' | 'realisee';
  created_at: string;
  technician?: User;
  technicians?: User[];
  extrabat_intervention_id?: string;
  photos?: InterventionPhoto[];
}

export interface MaintenanceFilters {
  q?: string;
  user_id?: string;
  city?: string;
  system_type?: string;
  status?: string;
  priority?: boolean;
  sort?: 'client_name' | 'city_derived' | 'assigned_user_id' | 'battery_installation_year';
  order?: 'asc' | 'desc';
}

export const MAINTENANCE_STATUS_LABELS = {
  a_realiser: 'À réaliser',
  prevue: 'Prévue',
  realisee: 'Réalisée'
} as const;

export const BILLING_MODE_LABELS = {
  debut_annee: 'Facturation début d\'année',
  grenke: 'Grenke',
  sur_devis: 'Sur devis',
  apres_visite: 'Après la visite'
} as const;

export const CLIENT_TYPE_LABELS = {
  particulier: 'Particulier',
  pro: 'Pro',
  collectivite: 'Collectivité'
} as const;

export interface CustomBrand {
  id: string;
  name: string;
  created_at: string;
}

export const DEFAULT_BRANDS = [
  'Ajax',
  'Daitem',
  'Bentel',
  'Risco',
  'Aritech',
  'Delta Dore',
  'Honeywell',
  'Fichet',
  'DSC',
  'Autre'
] as const;