import { command } from "../../../shared/lib/tauri";
import type { Tag, UpdateTagPayload } from "../../../shared/types/domain";

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

export function updateTag(tagId: string, payload: UpdateTagPayload) {
  return command<Tag>("update_tag", { tagId, payload });
}

export function deleteTag(tagId: string) {
  return command<void>("delete_tag", { tagId });
}
