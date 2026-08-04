CREATE TABLE public.shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocolo_id uuid REFERENCES public.protocolos(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shared_links_user_id_idx ON public.shared_links(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_links TO authenticated;
GRANT ALL ON public.shared_links TO service_role;

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_links_select_own ON public.shared_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY shared_links_insert_own ON public.shared_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY shared_links_update_own ON public.shared_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY shared_links_delete_own ON public.shared_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER shared_links_updated_at
  BEFORE UPDATE ON public.shared_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_shared_link(_dias integer DEFAULT 30, _protocolo_id uuid DEFAULT NULL)
RETURNS public.shared_links
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_row public.shared_links;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado';
  END IF;
  INSERT INTO public.shared_links (user_id, protocolo_id, expires_at)
  VALUES (auth.uid(), _protocolo_id, now() + make_interval(days => GREATEST(COALESCE(_dias, 30), 1)))
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_shared_link(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.shared_links
     SET revoked_at = now()
   WHERE token = _token AND user_id = auth.uid() AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END; $$;

CREATE OR REPLACE FUNCTION public.get_shared_report(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_link public.shared_links; v_result jsonb;
BEGIN
  SELECT * INTO v_link FROM public.shared_links
   WHERE token = _token AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'paciente', (
      SELECT jsonb_build_object('nome', p.nome, 'data_nascimento', p.data_nascimento, 'sexo', p.sexo)
      FROM public.profiles p WHERE p.id = v_link.user_id
    ),
    'protocolo', (
      SELECT to_jsonb(pr) FROM public.protocolos pr
       WHERE pr.user_id = v_link.user_id
         AND (v_link.protocolo_id IS NULL OR pr.id = v_link.protocolo_id)
       ORDER BY pr.created_at DESC LIMIT 1
    ),
    'medicoes', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.data, m.periodo, m.ordem)
      FROM public.medicoes m WHERE m.user_id = v_link.user_id
    ), '[]'::jsonb),
    'medias', COALESCE((
      SELECT jsonb_agg(to_jsonb(md) ORDER BY md.data, md.periodo)
      FROM public.medias_periodo md WHERE md.user_id = v_link.user_id
    ), '[]'::jsonb),
    'expires_at', v_link.expires_at
  ) INTO v_result;

  RETURN v_result;
END; $$;

REVOKE ALL ON FUNCTION public.create_shared_link(integer, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_shared_link(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_shared_report(text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_shared_link(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_shared_link(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_report(text) TO anon, authenticated;