import { command } from "../../../shared/lib/tauri";
import type { FileRecord, VersionNode } from "../../../shared/types/domain";

export type CreateDerivedVersionPayload = {
  name?: string;
};

export function createDerivedVersion(sourceFileId: string, payload: CreateDerivedVersionPayload) {
  return command<FileRecord>("create_derived_version", { sourceFileId, payload });
}

export function setVersionRole(fileId: string, role: string) {
  return command<VersionNode>("set_version_role", { fileId, role });
}

export function setCoreVersion(versionGroupId: string, role: string, fileId: string) {
  return command<VersionNode>("set_core_version", { versionGroupId, role, fileId });
}

export function getVersionChain(fileId: string) {
  return command<VersionNode[]>("get_version_chain", { fileId });
}
