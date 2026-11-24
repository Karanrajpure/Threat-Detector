CREATE TABLE public.workspace_member_revocations (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  removed_by uuid NOT NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
GRANT ALL ON public.workspace_member_revocations TO service_role;
REVOKE ALL ON public.workspace_member_revocations FROM PUBLIC, anon, authenticated;
ALTER TABLE public.workspace_member_revocations ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.workspace_member_revocations IS 'Private durable manager removals; shared invite codes cannot restore revoked membership.';

CREATE OR REPLACE FUNCTION public.record_workspace_member_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NOT NULL AND actor <> OLD.user_id AND public.can_manage_ws(OLD.workspace_id, actor) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD.workspace_id::text || ':' || OLD.user_id::text, 0));
    INSERT INTO public.workspace_member_revocations(workspace_id, user_id, removed_by)
    VALUES (OLD.workspace_id, OLD.user_id, actor)
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET removed_by = EXCLUDED.removed_by, removed_at = now();
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.record_workspace_member_removal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_workspace_member_removal BEFORE DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.record_workspace_member_removal();

CREATE OR REPLACE FUNCTION public.join_workspace(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO ws FROM public.workspaces WHERE invite_code = upper(trim(_code));
  IF ws IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(ws::text || ':' || uid::text, 0));
  IF EXISTS (SELECT 1 FROM public.workspace_member_revocations WHERE workspace_id = ws AND user_id = uid) THEN
    RAISE EXCEPTION 'Your access to this workspace has been removed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES (ws, uid, 'analyst') ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.activity_log(workspace_id,user_id,action) VALUES (ws, uid, 'joined the workspace');
  END IF;
  RETURN ws;
END;
$$;
REVOKE ALL ON FUNCTION public.join_workspace(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_workspace(text) TO authenticated;