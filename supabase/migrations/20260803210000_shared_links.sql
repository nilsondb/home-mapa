CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- LINKS DE COMPARTILHAMENTO
-- =========================================================

CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  -- Nunca armazenamos o token original, apenas seu hash.
  token_hash TEXT NOT NULL UNIQUE,

  period_type TEXT NOT NULL DEFAULT 'last_7_days'
    CHECK (
      period_type IN (
        'last_7_days',
        'last_30_days',
        'all_history',
        'custom'
      )
    ),

  start_date DATE,
  end_date DATE,

  expires_at TIMESTAMPTZ,

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shared_links_user_id_idx
  ON public.shared_links(user_id);

CREATE INDEX IF NOT EXISTS shared_links_token_hash_idx
  ON public.shared_links(token_hash);

CREATE INDEX IF NOT EXISTS shared_links_active_idx
  ON public.shared_links(active);

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- O paciente pode visualizar apenas seus próprios links.
DROP POLICY IF EXISTS "shared_links_select_own"
  ON public.shared_links;

CREATE POLICY "shared_links_select_own"
  ON public.shared_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- O paciente pode revogar seus próprios links.
DROP POLICY IF EXISTS "shared_links_update_own"
  ON public.shared_links;

CREATE POLICY "shared_links_update_own"
  ON public.shared_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, UPDATE
  ON public.shared_links
  TO authenticated;

GRANT ALL
  ON public.shared_links
  TO service_role;

-- =========================================================
-- GERAR LINK SEGURO
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_shared_link(
  p_period_type TEXT DEFAULT 'last_7_days',
  p_validity_days INTEGER DEFAULT 7,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_expires_at TIMESTAMPTZ;
  v_link_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF p_period_type NOT IN (
    'last_7_days',
    'last_30_days',
    'all_history',
    'custom'
  ) THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;

  CASE p_period_type
    WHEN 'last_7_days' THEN
      v_start_date := CURRENT_DATE - 6;
      v_end_date := CURRENT_DATE;

    WHEN 'last_30_days' THEN
      v_start_date := CURRENT_DATE - 29;
      v_end_date := CURRENT_DATE;

    WHEN 'all_history' THEN
      v_start_date := NULL;
      v_end_date := NULL;

    WHEN 'custom' THEN
      IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RAISE EXCEPTION
          'Informe as datas inicial e final.';
      END IF;

      IF p_start_date > p_end_date THEN
        RAISE EXCEPTION
          'A data inicial não pode ser posterior à data final.';
      END IF;

      v_start_date := p_start_date;
      v_end_date := p_end_date;
  END CASE;

  -- 32 bytes aleatórios representados em hexadecimal.
  v_token := encode(gen_random_bytes(32), 'hex');

  -- O banco guarda somente o hash.
  v_token_hash := encode(
    digest(v_token, 'sha256'),
    'hex'
  );

  IF p_validity_days IS NULL OR p_validity_days <= 0 THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at :=
      NOW() + make_interval(days => p_validity_days);
  END IF;

  INSERT INTO public.shared_links (
    user_id,
    token_hash,
    period_type,
    start_date,
    end_date,
    expires_at
  )
  VALUES (
    v_user_id,
    v_token_hash,
    p_period_type,
    v_start_date,
    v_end_date,
    v_expires_at
  )
  RETURNING id INTO v_link_id;

  RETURN jsonb_build_object(
    'id', v_link_id,
    'token', v_token,
    'path', '/shared/' || v_token,
    'period_type', p_period_type,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL
  ON FUNCTION public.create_shared_link(
    TEXT,
    INTEGER,
    DATE,
    DATE
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.create_shared_link(
    TEXT,
    INTEGER,
    DATE,
    DATE
  )
  TO authenticated;

-- =========================================================
-- REVOGAR LINK
-- =========================================================

CREATE OR REPLACE FUNCTION public.revoke_shared_link(
  p_link_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  UPDATE public.shared_links
  SET
    active = FALSE,
    revoked_at = NOW()
  WHERE
    id = p_link_id
    AND user_id = auth.uid()
    AND active = TRUE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;

REVOKE ALL
  ON FUNCTION public.revoke_shared_link(UUID)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.revoke_shared_link(UUID)
  TO authenticated;

-- =========================================================
-- CONSULTAR RELATÓRIO PELO TOKEN
-- Função pública, somente leitura.
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_shared_report(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token_hash TEXT;
  v_link public.shared_links%ROWTYPE;
  v_profile JSONB;
  v_medicoes JSONB;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN
    RAISE EXCEPTION 'Link inválido.';
  END IF;

  v_token_hash := encode(
    digest(p_token, 'sha256'),
    'hex'
  );

  SELECT *
  INTO v_link
  FROM public.shared_links
  WHERE
    token_hash = v_token_hash
    AND active = TRUE
    AND (
      expires_at IS NULL
      OR expires_at > NOW()
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Este link é inválido, expirou ou foi revogado.';
  END IF;

  SELECT
    to_jsonb(p)
      - ARRAY[
          'id',
          'email',
          'telefone',
          'created_at',
          'updated_at'
        ]
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_link.user_id;

  SELECT COALESCE(
    jsonb_agg(
      (
        to_jsonb(m)
          - ARRAY[
              'user_id',
              'protocolo_id'
            ]
      )
      ORDER BY
        m.data ASC,
        m.periodo ASC,
        m.ordem ASC
    ),
    '[]'::JSONB
  )
  INTO v_medicoes
  FROM public.medicoes m
  WHERE
    m.user_id = v_link.user_id

    AND (
      v_link.start_date IS NULL
      OR m.data >= v_link.start_date
    )

    AND (
      v_link.end_date IS NULL
      OR m.data <= v_link.end_date
    );

  RETURN jsonb_build_object(
    'shared', jsonb_build_object(
      'period_type', v_link.period_type,
      'start_date', v_link.start_date,
      'end_date', v_link.end_date,
      'expires_at', v_link.expires_at,
      'created_at', v_link.created_at
    ),
    'profile', COALESCE(v_profile, '{}'::JSONB),
    'medicoes', v_medicoes,
    'generated_at', NOW()
  );
END;
$$;

REVOKE ALL
  ON FUNCTION public.get_shared_report(TEXT)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.get_shared_report(TEXT)
  TO anon, authenticated;
