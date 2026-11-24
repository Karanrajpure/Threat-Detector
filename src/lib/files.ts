export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export function validateUpload(file: { name: string; size: number }) {
  if (!file.name.trim() || file.name.length > 255) return "Use a filename between 1 and 255 characters.";
  if (file.size <= 0) return "Empty files cannot be uploaded.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}
export function filePath(workspaceId: string, userId: string, name: string, id: string) {
  return `${workspaceId}/${userId}/${id}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}
export function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}