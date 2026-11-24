import { describe, expect, it } from "vitest";
import { filePath, MAX_FILE_BYTES, validateUpload } from "./files";
describe("workspace uploads", () => {
  it("enforces the 10 MB single-file limit", () => {
    expect(MAX_FILE_BYTES).toBe(10485760);
    expect(validateUpload({ name: "report.pdf", size: 10485760 })).toBeNull();
    expect(validateUpload({ name: "report.pdf", size: 10485761 })).not.toBeNull();
  });
  it("rejects empty files", () => {
    expect(validateUpload({ name: "empty.txt", size: 0 })).not.toBeNull();
  });
  it("keeps names inside the uploader's workspace folder", () => {
    expect(filePath("workspace", "uploader", "../report.pdf", "unique")).toBe("workspace/uploader/unique-.._report.pdf");
  });
});