-- ===========================================
-- RESTAURAR IMAGENS DOS VEÍCULOS
-- Medeiros Veículos - Execute no Supabase SQL Editor
-- ===========================================

-- Toyota Hilux SW4
UPDATE vehicles
SET images = ARRAY['/cars/hilux-1.jpeg','/cars/hilux-2.jpeg','/cars/hilux-3.jpeg','/cars/hilux-4.jpeg','/cars/hilux-5.jpeg','/cars/hilux-6.jpeg','/cars/hilux-7.jpeg','/cars/hilux-8.jpeg','/cars/hilux-9.jpeg','/cars/hilux-10.jpeg','/cars/hilux-11.jpeg','/cars/hilux-12.jpeg','/cars/hilux-13.jpeg','/cars/hilux-14.jpeg','/cars/hilux-15.jpeg','/cars/hilux-16.jpeg','/cars/hilux-17.jpeg','/cars/hilux-18.jpeg','/cars/hilux-19.jpeg','/cars/hilux-20.jpeg','/cars/hilux-21.jpeg']
WHERE brand ILIKE '%Toyota%' AND model ILIKE '%Hilux%';

-- Honda HR-V
UPDATE vehicles
SET images = ARRAY['/cars/hrv-1.jpeg','/cars/hrv-2.jpeg','/cars/hrv-3.jpeg','/cars/hrv-4.jpeg','/cars/hrv-5.jpeg','/cars/hrv-6.jpeg','/cars/hrv-7.jpeg','/cars/hrv-8.jpeg','/cars/hrv-9.jpeg','/cars/hrv-10.jpeg','/cars/hrv-11.jpeg','/cars/hrv-12.jpeg','/cars/hrv-13.jpeg','/cars/hrv-14.jpeg','/cars/hrv-15.jpeg','/cars/hrv-16.jpeg']
WHERE brand ILIKE '%Honda%' AND model ILIKE '%HR-V%';

-- Kawasaki Ninja 400
UPDATE vehicles
SET images = ARRAY['/cars/moto-1.jpeg','/cars/moto-2.jpeg','/cars/moto-3.jpeg','/cars/moto-4.jpeg','/cars/moto-5.jpeg','/cars/moto-6.jpeg','/cars/moto-7.jpeg','/cars/moto-8.jpeg','/cars/moto-9.jpeg','/cars/moto-10.jpeg','/cars/moto-11.jpeg','/cars/moto-12.jpeg']
WHERE brand ILIKE '%Kawasaki%' AND model ILIKE '%Ninja%';

-- Chevrolet Onix Plus Premier
UPDATE vehicles
SET images = ARRAY['/cars/onix-1.jpeg','/cars/onix-2.jpeg','/cars/onix-3.jpeg','/cars/onix-4.jpeg','/cars/onix-5.jpeg','/cars/onix-6.jpeg','/cars/onix-7.jpeg','/cars/onix-8.jpeg','/cars/onix-9.jpeg','/cars/onix-10.jpeg','/cars/onix-11.jpeg','/cars/onix-12.jpeg','/cars/onix-13.jpeg','/cars/onix-14.jpeg','/cars/onix15.jpeg','/cars/onix-16.jpeg','/cars/onix-17.jpeg','/cars/onix-18.jpeg','/cars/onix-19.jpeg','/cars/onix-20.jpeg','/cars/onix-21.jpeg']
WHERE brand ILIKE '%Chevrolet%' AND model ILIKE '%Onix%';

-- Honda CG 160
UPDATE vehicles
SET images = ARRAY['/cars/titan-1.png','/cars/titan-2.png','/cars/titan-3.png','/cars/titan-4.png','/cars/titan-5.png','/cars/titan-6.png','/cars/titan-7.png','/cars/titan-8.png','/cars/titan-9.png','/cars/titan-10.png']
WHERE brand ILIKE '%Honda%' AND model ILIKE '%CG%';

-- Mitsubishi L200 Triton
UPDATE vehicles
SET images = ARRAY['/cars/L200-1.jpeg','/cars/L200-2.jpeg','/cars/L200-3.jpeg','/cars/L200-4.jpeg','/cars/L200-5.jpeg','/cars/L200-6.jpeg','/cars/L200-7.jpeg','/cars/L200-8.jpeg','/cars/L200-9.jpeg','/cars/L200-10.jpeg','/cars/L200-11.jpeg','/cars/L200-12.jpeg','/cars/L200-13.jpeg','/cars/L200-14.jpeg','/cars/L200-15.jpeg','/cars/L200-16.jpeg','/cars/L200-17.jpeg']
WHERE brand ILIKE '%Mitsubishi%' AND model ILIKE '%L200%';

-- Mitsubishi Pajero Full
UPDATE vehicles
SET images = ARRAY['/cars/Pagero-1.jpeg','/cars/Pagero-2.jpeg','/cars/Pagero-3.jpeg','/cars/Pagero-4.jpeg','/cars/Pagero-5.jpeg','/cars/Pagero-6.jpeg','/cars/Pagero-7.jpeg','/cars/Pagero-8.jpeg','/cars/Pagero-9.jpeg','/cars/Pagero-10.jpeg','/cars/Pagero-11.jpeg','/cars/Pagero-12.jpeg','/cars/Pagero-13.jpeg','/cars/Pagero-14.jpeg','/cars/Pagero-15.jpeg']
WHERE brand ILIKE '%Mitsubishi%' AND model ILIKE '%Pajero%';

-- Suzuki Grand Vitara
UPDATE vehicles
SET images = ARRAY['/cars/vitara-1.jpeg','/cars/vitara-2.jpeg','/cars/vitara-3.jpeg','/cars/vitara-4.jpeg','/cars/vitara-5.jpeg','/cars/vitara-6.jpeg','/cars/vitara-7.jpeg','/cars/vitara-8.jpeg','/cars/vitara-9.jpeg','/cars/vitara-10.jpeg','/cars/vitara-11.jpeg','/cars/vitara-12.jpeg','/cars/vitara-13.jpeg','/cars/vitara-14.jpeg','/cars/vitara-15.jpeg']
WHERE brand ILIKE '%Suzuki%' AND model ILIKE '%Vitara%';

-- Ford Ranger
UPDATE vehicles
SET images = ARRAY['/cars/Ranger-1.jpeg','/cars/Ranger-2.jpeg','/cars/Ranger-3.jpeg','/cars/Ranger-4.jpeg','/cars/Ranger-5.jpeg','/cars/Ranger-6.jpeg','/cars/Ranger-7.jpeg','/cars/Ranger-8.jpeg','/cars/Ranger-9.jpeg','/cars/Ranger-10.jpeg','/cars/Ranger-11.jpeg','/cars/Ranger-12.jpeg','/cars/Ranger-13.jpeg','/cars/Ranger-14.jpeg','/cars/Ranger-15.jpeg','/cars/Ranger-16.jpeg','/cars/Ranger-17.jpeg','/cars/Ranger-18.jpeg','/cars/Ranger-19.jpeg','/cars/Ranger-20.jpeg','/cars/Ranger-21.jpeg','/cars/Ranger-22.jpeg']
WHERE brand ILIKE '%Ford%' AND model ILIKE '%Ranger%';

-- VW Spacefox
UPDATE vehicles
SET images = ARRAY['/cars/space-1.jpeg','/cars/space-2.jpeg','/cars/space-3.jpeg','/cars/space-4.jpeg','/cars/space-5.jpeg','/cars/space-6.jpeg','/cars/space-7.jpeg','/cars/space-8.jpeg','/cars/space-9.jpeg','/cars/space-10.jpeg','/cars/space-11.jpeg','/cars/space-12.jpeg','/cars/space-13.jpeg','/cars/space-14.jpeg']
WHERE brand ILIKE '%Volkswagen%' AND (model ILIKE '%Spacefox%' OR model ILIKE '%Space%');

-- Verificar resultado
SELECT name, brand, model, array_length(images, 1) as total_imagens
FROM vehicles
ORDER BY brand;
