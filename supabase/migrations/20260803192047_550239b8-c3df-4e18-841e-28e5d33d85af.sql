CREATE OR REPLACE FUNCTION public.recalc_media_periodo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID; v_data DATE; v_periodo public.periodo_dia;
  v_s NUMERIC; v_d NUMERIC; v_p NUMERIC; v_n INT; v_proto UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user := OLD.user_id; v_data := OLD.data; v_periodo := OLD.periodo;
  ELSE
    v_user := NEW.user_id; v_data := NEW.data; v_periodo := NEW.periodo;
  END IF;

  SELECT AVG(sistolica), AVG(diastolica), AVG(pulso), COUNT(*)
    INTO v_s, v_d, v_p, v_n
  FROM public.medicoes
  WHERE user_id = v_user AND data = v_data AND periodo = v_periodo;

  SELECT protocolo_id INTO v_proto
  FROM public.medicoes
  WHERE user_id = v_user AND data = v_data AND periodo = v_periodo
    AND protocolo_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

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
END; $function$;