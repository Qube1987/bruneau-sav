/*
  # Add Maintenance Billing and Tracking Fields

  ## Overview
  This migration adds comprehensive billing and tracking fields to the maintenance_contracts table
  to support advanced dashboard analytics and client management.

  ## New Fields Added

  1. **Financial Fields**
     - `annual_amount` (numeric) - Annual contract price (excluding tax)
     - `billing_mode` (text) - Billing method with options:
       - 'debut_annee' (Beginning of year billing)
       - 'grenke' (Grenke financing)
       - 'sur_devis' (Quote-based)
       - 'apres_visite' (After visit)
     - `invoice_sent` (boolean) - Whether invoice/quote has been sent
     - `invoice_paid` (boolean) - Whether invoice has been paid

  2. **Client Classification**
     - `client_type` (text) - Client category:
       - 'particulier' (Individual)
       - 'pro' (Professional)
       - 'collectivite' (Public entity)

  3. **Visit Tracking**
     - `last_year_visit_date` (date) - Date of previous year's maintenance visit

  4. **Notes**
     - `observations` (text) - Free-form notes and observations

  ## Dashboard Statistics Support
  These fields enable calculation of:
  - Total contract value
  - January collection amount (debut_annee billing mode)
  - Remaining to invoice (apres_visite billing mode without invoice_sent)
  - Remaining to collect (invoice_sent = true but invoice_paid = false)
*/

-- Add financial fields
ALTER TABLE maintenance_contracts
ADD COLUMN IF NOT EXISTS annual_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_mode text DEFAULT 'debut_annee',
ADD COLUMN IF NOT EXISTS invoice_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_paid boolean DEFAULT false;

-- Add client classification
ALTER TABLE maintenance_contracts
ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'particulier';

-- Add visit tracking
ALTER TABLE maintenance_contracts
ADD COLUMN IF NOT EXISTS last_year_visit_date date;

-- Add observations
ALTER TABLE maintenance_contracts
ADD COLUMN IF NOT EXISTS observations text;

-- Add check constraint for billing_mode
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'maintenance_contracts_billing_mode_check'
  ) THEN
    ALTER TABLE maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_billing_mode_check 
    CHECK (billing_mode IN ('debut_annee', 'grenke', 'sur_devis', 'apres_visite'));
  END IF;
END $$;

-- Add check constraint for client_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'maintenance_contracts_client_type_check'
  ) THEN
    ALTER TABLE maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_client_type_check 
    CHECK (client_type IN ('particulier', 'pro', 'collectivite'));
  END IF;
END $$;

-- Add index for billing mode queries (for dashboard performance)
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_billing_mode 
ON maintenance_contracts(billing_mode);

-- Add index for invoice status queries
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_invoice_status 
ON maintenance_contracts(invoice_sent, invoice_paid);

-- Add index for client type
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_client_type 
ON maintenance_contracts(client_type);

-- Add comment explaining the schema
COMMENT ON COLUMN maintenance_contracts.annual_amount IS 'Annual contract price in euros (HT - excluding tax)';
COMMENT ON COLUMN maintenance_contracts.billing_mode IS 'Billing method: debut_annee, grenke, sur_devis, apres_visite';
COMMENT ON COLUMN maintenance_contracts.client_type IS 'Client category: particulier, pro, collectivite';
COMMENT ON COLUMN maintenance_contracts.last_year_visit_date IS 'Date of the maintenance visit from the previous year';
