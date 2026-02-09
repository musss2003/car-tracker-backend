-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Add missing columns to car_registration table
ALTER TABLE car_registration ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE car_registration ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE car_registration ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE car_registration ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Add foreign key constraints for car_registration
ALTER TABLE car_registration ADD CONSTRAINT fk_car_registration_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE car_registration ADD CONSTRAINT fk_car_registration_updated_by 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add missing columns to car_service_history table
ALTER TABLE car_service_history ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE car_service_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE car_service_history ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE car_service_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Add foreign key constraints for car_service_history
ALTER TABLE car_service_history ADD CONSTRAINT fk_car_service_history_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE car_service_history ADD CONSTRAINT fk_car_service_history_updated_by 
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
