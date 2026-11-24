import { describe, expect, it } from "vitest";
import { activityActor } from "./db";

describe("activity attribution", () => {
  it("attributes asset additions to the recorded user, not the current viewer", () => {
    expect(activityActor("uploader", [
      { user_id: "viewer", display_name: "Viewer", email: "viewer@example.com" },
      { user_id: "uploader", display_name: "Karan", email: "karan@example.com" },
    ])).toEqual({ name: "Karan", email: "karan@example.com" });
  });
  it("does not label an unavailable uploader as a system action", () => {
    expect(activityActor("former-user", []).name).toBe("Former or unavailable member");
    expect(activityActor(null, []).name).toBe("System");
  });
});