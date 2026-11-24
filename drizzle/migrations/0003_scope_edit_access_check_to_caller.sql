CREATE OR REPLACE FUNCTION public.can_edit_ws(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR _uid IS DISTINCT FROM caller THEN
    RETURN false;
  END IF;
  RETURN coalesce(public.ws_role(_ws, caller) IN ('owner', 'admin', 'analyst'), false);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.can_edit_ws(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_ws(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.can_edit_ws(uuid, uuid) IS 'Checks only the authenticated caller editing permissions; other user identifiers return false without querying their role.';