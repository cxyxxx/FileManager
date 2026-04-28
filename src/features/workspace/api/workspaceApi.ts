import { command } from "../../../shared/lib/tauri";
import type { WorkspaceInfo } from "../../../shared/types/domain";

export function initWorkspace(path?: string) {
  return command<WorkspaceInfo>("init_workspace", { path: path ?? null });
}

export function getWorkspaceInfo() {
  return command<WorkspaceInfo>("get_workspace_info");
}
