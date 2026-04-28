import { useCallback, useEffect, useState } from "react";
import type { Tag } from "../../../shared/types/domain";
import { createTag, listTags, type CreateTagPayload } from "../api/tagsApi";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTags(await listTags());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (payload: CreateTagPayload) => {
      const tag = await createTag(payload);
      await refresh();
      return tag;
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tags, loading, error, create, refresh };
}
