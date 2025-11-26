-- ============================================
-- SOLUCIÓN COMPLETA: payment_methods
-- ============================================
-- Este script verifica y corrige la estructura de payment_methods
-- para que coincida con el código de la aplicación
-- ============================================

-- Paso 1: Verificar estructura actual
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- Paso 2: Si existe columna "brand" y es NOT NULL, hacerla nullable o agregar default
DO $$
BEGIN
  -- Verificar si brand existe y es NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'brand'
    AND is_nullable = 'NO'
  ) THEN
    -- Opción 1: Hacer nullable
    ALTER TABLE public.payment_methods ALTER COLUMN brand DROP NOT NULL;
    RAISE NOTICE 'Columna brand ahora es nullable';
    
    -- O Opción 2: Agregar valor por defecto (descomentar si prefieres esto)
    -- ALTER TABLE public.payment_methods ALTER COLUMN brand SET DEFAULT 'N/A';
    -- RAISE NOTICE 'Columna brand ahora tiene valor por defecto';
  END IF;
END $$;

-- Paso 3: Asegurar que todas las columnas necesarias existan
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS card_number VARCHAR(19);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(7);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS bank VARCHAR(255);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Si brand no existe pero el error persiste, agregarla como nullable
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Hacer brand nullable si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'brand'
  ) THEN
    ALTER TABLE public.payment_methods ALTER COLUMN brand DROP NOT NULL;
  END IF;
END $$;

-- Paso 4: Agregar constraint de type si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%payment_methods_type%'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payment_methods' 
      AND column_name = 'type'
    ) THEN
      ALTER TABLE public.payment_methods 
      ADD CONSTRAINT payment_methods_type_check 
      CHECK (type IN ('card', 'transfer', 'cash', 'credit'));
    END IF;
  END IF;
END $$;

-- Paso 5: Hacer type y name NOT NULL si tienen valores NULL
DO $$
BEGIN
  -- Actualizar valores NULL en type
  UPDATE public.payment_methods SET type = 'card' WHERE type IS NULL;
  
  -- Actualizar valores NULL en name
  UPDATE public.payment_methods SET name = 'Sin nombre' WHERE name IS NULL;
  
  -- Hacer NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'type'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.payment_methods ALTER COLUMN type SET NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'name'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.payment_methods ALTER COLUMN name SET NOT NULL;
  END IF;
END $$;

-- Paso 6: Verificar estructura final
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- ✅ La tabla payment_methods está lista para usar


