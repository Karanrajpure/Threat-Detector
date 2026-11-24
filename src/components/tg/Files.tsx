import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { activityActor, canEdit, canManage, type WsRole } from "@/lib/db";
import { filePath, fileSize, validateUpload } from "@/lib/files";
import type { Member } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Confirm } from "./Confirm";

const BUCKET = "workspace-files";
export function Files({ workspaceId, userId, role, members }: { workspaceId: string; userId: string; role: WsRole | undefined; members: Member[] }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const key = ["ws", workspaceId, "files"];
  const files = useQuery({ queryKey: key, queryFn: async () => {
    const { data, error } = await supabase.from("workspace_files").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }, refetchInterval: 30000 });
  const refresh = async () => { await qc.invalidateQueries({ queryKey: key }); await qc.invalidateQueries({ queryKey: ["ws", workspaceId, "activity"] }); };
  async function upload(selected: File[]) {
    if (busy || !canEdit(role) || !userId) return;
    setBusy(true);
    try {
      for (const file of selected) {
        const validation = validateUpload(file);
        if (validation) { toast.error(`${file.name}: ${validation}`); continue; }
        setStatus(`Uploading ${file.name}…`);
        const path = filePath(workspaceId, userId, file.name, crypto.randomUUID());
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: "application/octet-stream" });
        if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
        const { error: recordError } = await supabase.from("workspace_files").insert({ workspace_id: workspaceId, uploaded_by: userId, name: file.name, storage_path: path, size_bytes: file.size });
        if (recordError) {
          await supabase.storage.from(BUCKET).remove([path]);
          toast.error(`Could not save file details: ${recordError.message}`);
        } else toast.success(`${file.name} uploaded`);
      }
      await refresh();
    } catch { toast.error("Upload interrupted. Please try again."); }
    finally { setBusy(false); setStatus(""); if (input.current) input.current.value = ""; }
  }
  async function download(path: string, name: string) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error || !data) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Could not download this file. Please try again."); }
  }
  async function remove(id: string, path: string) {
    setBusy(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      const { error: recordError } = await supabase.from("workspace_files").delete().eq("id", id);
      if (recordError) throw recordError;
      await refresh(); toast.success("File deleted");
    } catch { toast.error("Could not delete this file. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Private team files · up to 10 MB each</span><Button size="icon" variant="ghost" aria-label="Refresh files" title="Refresh files" onClick={() => files.refetch()}><RefreshCw className="size-4" /></Button></div>
    {canEdit(role) && <div onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(Array.from(e.dataTransfer.files)); }} className={`flex flex-col items-center gap-3 rounded-md border border-dashed p-6 ${dragging ? "border-primary bg-accent" : "border-border"}`}>
      <input ref={input} type="file" multiple className="hidden" aria-label="Upload workspace files" onChange={(e) => void upload(Array.from(e.target.files ?? []))} disabled={busy} />
      <Button disabled={busy} onClick={() => input.current?.click()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {busy ? "Uploading…" : "Upload files"}</Button>
      <p role="status" className="max-w-full break-words text-center text-xs text-muted-foreground">{status || "Drop files here"}</p>
    </div>}
    {files.isPending ? <Skeleton className="h-24" /> : files.isError ? <p role="alert" className="text-sm text-destructive">Files could not be loaded. Use Refresh files to retry.</p> : !files.data?.length ? <p className="py-6 text-center text-sm text-muted-foreground">No files uploaded yet.</p> : <ul className="divide-y divide-border">{files.data.map((file) => {
      const actor = activityActor(file.uploaded_by, members);
      return <li key={file.id} className="flex items-start gap-3 py-3"><FileText className="mt-1 size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{fileSize(file.size_bytes)} · Uploaded by {actor.name}</p>{actor.email && <p className="break-all text-xs text-muted-foreground">{actor.email}</p>}<time className="text-xs text-muted-foreground" dateTime={file.created_at}>{new Date(file.created_at).toLocaleString()}</time></div>
        <Button size="icon" variant="outline" title={`Download ${file.name}`} aria-label={`Download ${file.name}`} onClick={() => void download(file.storage_path, file.name)}><Download className="size-4" /></Button>
        {(file.uploaded_by === userId || canManage(role)) && <Confirm title={`Delete ${file.name}?`} description="This removes the file for the entire team. The deletion stays in activity history." onConfirm={() => void remove(file.id, file.storage_path)}><Button disabled={busy} size="icon" variant="ghost" className="text-destructive" title={`Delete ${file.name}`} aria-label={`Delete ${file.name}`}><Trash2 className="size-4" /></Button></Confirm>}
      </li>;
    })}</ul>}
  </div>;
}