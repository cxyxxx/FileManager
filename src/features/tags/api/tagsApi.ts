import { command } from "../../../shared/lib/tauri";
import type { Tag } from "../../../shared/types/domain";

export type CreateTagPayload = {
  name: string;
  tagType: string;
  parentId?: string | null;
  isTopicEnabled?: boolean;
};

export function createTag(payload: CreateTagPayload) {
  return command<Tag>("create_tag", { payload });
}

export function listTags() {
  return command<Tag[]>("list_tags");
}

export function setTagParent(childId: string, parentId?: string | null) {
  return command<Tag>("set_tag_parent", { childId, parentId: parentId ?? null });
}

export function attachTagsToFile(fileId: string, tagIds: string[]) {
  return command<void>("attach_tags_to_file", { fileId, tagIds });
}
