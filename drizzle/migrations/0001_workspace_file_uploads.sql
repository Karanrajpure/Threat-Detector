CREATE TABLE public.workspace_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 uploaded_by uuid NOT NULL DEFAULT auth.uid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
 storage_path text NOT NULL UNIQUE,
 size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.workspace_files TO authenticated;
GRANT ALL ON public.workspace_files TO service_role;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace files read" ON public.workspace_files FOR SELECT TO authenticated USING (public.is_ws_member(workspace_id, auth.uid()));
CREATE POLICY "workspace files upload" ON public.workspace_files FOR INSERT TO authenticated WITH CHECK (public.can_edit_ws(workspace_id, auth.uid()) AND uploaded_by = auth.uid() AND split_part(storage_path, '/', 1) = workspace_id::text AND split_part(storage_path, '/', 2) = auth.uid()::text AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'workspace-files' AND o.name = storage_path));
CREATE POLICY "workspace files remove" ON public.workspace_files FOR DELETE TO authenticated USING (public.is_ws_member(workspace_id, auth.uid()) AND (uploaded_by = auth.uid() OR public.can_manage_ws(workspace_id, auth.uid())));
CREATE POLICY "private workspace files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'workspace-files' AND public.is_ws_member((storage.foldername(name))[1]::uuid, auth.uid()));
CREATE POLICY "private workspace files upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'workspace-files' AND public.can_edit_ws((storage.foldername(name))[1]::uuid, auth.uid()) AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "private workspace files remove" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'workspace-files' AND public.is_ws_member((storage.foldername(name))[1]::uuid, auth.uid()) AND ((storage.foldername(name))[2] = auth.uid()::text OR public.can_manage_ws((storage.foldername(name))[1]::uuid, auth.uid())));
CREATE FUNCTION public.log_workspace_file_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  INSERT INTO public.activity_log(workspace_id, user_id, action, asset_name) VALUES (NEW.workspace_id, auth.uid(), 'uploaded file', NEW.name);
  RETURN NEW;
 END IF;
 INSERT INTO public.activity_log(workspace_id, user_id, action, asset_name) VALUES (OLD.workspace_id, auth.uid(), 'deleted file', OLD.name);
 RETURN OLD;
END;
$$;
CREATE TRIGGER workspace_files_log AFTER INSERT OR DELETE ON public.workspace_files FOR EACH ROW EXECUTE FUNCTION public.log_workspace_file_change();