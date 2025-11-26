-- ============================================
-- AGREGAR COLUMNAS FALTANTES A payment_methods
-- Versión segura que verifica antes de agregar
-- ============================================

-- Primero, verificar qué columnas existen actualmente
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- Agregar columnas básicas si no existen
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

-- Agregar constraint de type solo si la columna type existe
DO $$
BEGIN
  -- Verificar si el constraint ya existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%payment_methods_type%'
  ) THEN
    -- Verificar si la columna type existe antes de agregar el constraint
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

-- Hacer type NOT NULL solo si no lo es ya
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'type'
    AND is_nullable = 'YES'
  ) THEN
    -- Primero actualizar valores NULL si existen
    UPDATE public.payment_methods SET type = 'card' WHERE type IS NULL;
    -- Luego hacer NOT NULL
    ALTER TABLE public.payment_methods ALTER COLUMN type SET NOT NULL;
  END IF;
END $$;

-- Hacer name NOT NULL solo si no lo es ya
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'name'
    AND is_nullable = 'YES'
  ) THEN
    -- Primero actualizar valores NULL si existen
    UPDATE public.payment_methods SET name = 'Sin nombre' WHERE name IS NULL;
    -- Luego hacer NOT NULL
    ALTER TABLE public.payment_methods ALTER COLUMN name SET NOT NULL;
  END IF;
END $$;

-- Verificar estructura final
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- ✅ Columnas agregadas correctamente


