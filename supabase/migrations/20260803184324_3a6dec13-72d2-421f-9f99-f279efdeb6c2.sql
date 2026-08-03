-- ENUMS
CREATE TYPE public.app_role AS ENUM ('paciente','medico','admin');
CREATE TYPE public.periodo_dia AS ENUM ('manha','noite');
CREATE TYPE public.braco_medicao AS ENUM ('direito','esquerdo');
CREATE TYPE public.sexo_tipo AS ENUM ('masculino','feminino','outro','nao_informado');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  data_nascimento DATE,
  sexo public.sexo_tipo NOT NULL DEFAULT 'nao_informado',
  peso_kg NUMERIC(5,2),
  altura_cm NUMERIC(5,1),
  telefone TEXT,
  foto_url TEXT,
  crm TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'paciente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- MEDICO <-> PACIENTE
CREATE TABLE public.medico_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medico_id, paciente_id)
);
GRANT SELECT, INSERT, DELETE ON public.medico_paciente TO authenticated;
GRANT ALL ON public.medico_paciente TO service_role;
ALTER TABLE public.medico_paciente ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_medico_de(_medico UUID, _paciente UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.medico_paciente WHERE medico_id = _medico AND paciente_id = _paciente);
$$;

-- PROTOCOLOS
CREATE TABLE public.protocolos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  duracao_dias INTEGER NOT NULL DEFAULT 7,
  minimo_dias INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocolos TO authenticated;
GRANT ALL ON public.protocolos TO service_role;
ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;

-- MEDICOES
CREATE TABLE public.medicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocolo_id UUID REFERENCES public.protocolos(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::time,
  periodo public.periodo_dia NOT NULL,
  ordem SMALLINT NOT NULL DEFAULT 1,
  sistolica SMALLINT NOT NULL,
  diastolica SMALLINT NOT NULL,
  pulso SMALLINT,
  braco public.braco_medicao NOT NULL DEFAULT 'esquerdo',
  observacao TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medicoes_ordem_check CHECK (ordem IN (1,2)),
  CONSTRAINT medicoes_sistolica_check CHECK (sistolica BETWEEN 50 AND 300),
  CONSTRAINT medicoes_diastolica_check CHECK (diastolica BETWEEN 30 AND 200),
  UNIQUE (user_id, data, periodo, ordem)
);
CREATE INDEX medicoes_user_data_idx ON public.medicoes (user_id, data DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicoes TO authenticated;
GRANT ALL ON public.medicoes TO service_role;
ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;

-- MEDIAS POR PERIODO
CREATE TABLE public.medias_periodo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocolo_id UUID REFERENCES public.protocolos(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  periodo public.periodo_dia NOT NULL,
  media_sistolica NUMERIC(5,1) NOT NULL,
  media_diastolica NUMERIC(5,1) NOT NULL,
  media_pulso NUMERIC(5,1),
  qtd_afericoes SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, data, periodo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medias_periodo TO authenticated;
GRANT ALL ON public.medias_periodo TO service_role;
ALTER TABLE public.medias_periodo ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_medico_de(auth.uid(), id));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "vinculo_select" ON public.medico_paciente FOR SELECT TO authenticated
  USING (auth.uid() = medico_id OR auth.uid() = paciente_id);
CREATE POLICY "vinculo_insert_paciente" ON public.medico_paciente FOR INSERT TO authenticated WITH CHECK (auth.uid() = paciente_id);
CREATE POLICY "vinculo_delete" ON public.medico_paciente FOR DELETE TO authenticated
  USING (auth.uid() = paciente_id OR auth.uid() = medico_id);

CREATE POLICY "protocolos_select" ON public.protocolos FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_medico_de(auth.uid(), user_id));
CREATE POLICY "protocolos_insert_own" ON public.protocolos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "protocolos_update_own" ON public.protocolos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "protocolos_delete_own" ON public.protocolos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "medicoes_select" ON public.medicoes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_medico_de(auth.uid(), user_id));
CREATE POLICY "medicoes_insert_own" ON public.medicoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medicoes_update_own" ON public.medicoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medicoes_delete_own" ON public.medicoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "medias_select" ON public.medias_periodo FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_medico_de(auth.uid(), user_id));
CREATE POLICY "medias_insert_own" ON public.medias_periodo FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medias_update_own" ON public.medias_periodo FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medias_delete_own" ON public.medias_periodo FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER protocolos_updated_at BEFORE UPDATE ON public.protocolos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER medias_updated_at BEFORE UPDATE ON public.medias_periodo FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recalcula média automaticamente a partir das aferições
CREATE OR REPLACE FUNCTION public.recalc_media_periodo() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID; v_data DATE; v_periodo public.periodo_dia;
  v_s NUMERIC; v_d NUMERIC; v_p NUMERIC; v_n INT; v_proto UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user := OLD.user_id; v_data := OLD.data; v_periodo := OLD.periodo;
  ELSE
    v_user := NEW.user_id; v_data := NEW.data; v_periodo := NEW.periodo;
  END IF;

  SELECT AVG(sistolica), AVG(diastolica), AVG(pulso), COUNT(*), MAX(protocolo_id)
    INTO v_s, v_d, v_p, v_n, v_proto
  FROM public.medicoes
  WHERE user_id = v_user AND data = v_data AND periodo = v_periodo;

  IF v_n = 0 THEN
    DELETE FROM public.medias_periodo WHERE user_id = v_user AND data = v_data AND periodo = v_periodo;
  ELSE
    INSERT INTO public.medias_periodo (user_id, protocolo_id, data, periodo, media_sistolica, media_diastolica, media_pulso, qtd_afericoes)
    VALUES (v_user, v_proto, v_data, v_periodo, ROUND(v_s,1), ROUND(v_d,1), ROUND(v_p,1), v_n)
    ON CONFLICT (user_id, data, periodo) DO UPDATE SET
      media_sistolica = EXCLUDED.media_sistolica,
      media_diastolica = EXCLUDED.media_diastolica,
      media_pulso = EXCLUDED.media_pulso,
      qtd_afericoes = EXCLUDED.qtd_afericoes,
      protocolo_id = COALESCE(EXCLUDED.protocolo_id, public.medias_periodo.protocolo_id),
      updated_at = now();
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER medicoes_recalc_media
AFTER INSERT OR UPDATE OR DELETE ON public.medicoes
FOR EACH ROW EXECUTE FUNCTION public.recalc_media_periodo();

-- Cria perfil + papel + protocolo inicial no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role public.app_role;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'paciente');
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  IF v_role = 'paciente' THEN
    INSERT INTO public.protocolos (user_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();