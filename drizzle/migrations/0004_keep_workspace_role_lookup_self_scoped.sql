CREATE OR REPLACE FUNCTION public.ws_role(_ws uuid, _uid uuid)
RETURNS public.workspace_role LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid(); resolved_role public.workspace_role;
BEGIN
  IF caller IS NULL OR _uid IS DISTINCT FROM caller THEN
    RETURN NULL;
  END IF;
  SELECT role INTO resolved_role FROM public.workspace_members WHERE workspace_id = _ws AND user_id = caller;
  RETURN resolved_role;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ws_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_role(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.ws_role(uuid, uuid) IS 'Returns only the authenticated caller role; mismatched or anonymous callers receive null before membership lookup.';