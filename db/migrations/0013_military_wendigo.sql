ALTER TABLE "afe_details" ALTER COLUMN "partner_name" SET DEFAULT 'Sama Digital Foundation';
UPDATE "afe_details" SET partner_name = 'Sama Digital Foundation' WHERE partner_name LIKE '%Sama Digital Foundation%';
UPDATE "afe_devices" SET partner_name = 'Sama Digital Foundation' WHERE partner_name LIKE '%Sama Digital Foundation%';