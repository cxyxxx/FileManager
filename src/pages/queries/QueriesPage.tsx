import { FormEvent, useState } from "react";
import { queryFilesByTags } from "../../features/queries/api/queriesApi";
import { FileTable } from "../../features/files/components/FileTable";
import type { FileRecord } from "../../shared/types/domain";

export function QueriesPage() {
  const [tagIds, setTagIds] = useState("");
  const [mode, setMode] = useState<"and" | "or">("and");
  const [files, setFiles] = useState<FileRecord[]>([]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ids = tagIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    setFiles(await queryFilesByTags(ids, mode));
  }

  return (
    <section className="panel">
      <form className="toolbar" onSubmit={onSubmit}>
        <input
          className="input"
          value={tagIds}
          onChange={(event) => setTagIds(event.target.value)}
          placeholder="Tag ids separated by commas"
        />
        <select className="input" value={mode} onChange={(event) => setMode(event.target.value as "and" | "or")}>
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
        <button className="button" type="submit">
          Query
        </button>
      </form>
      <FileTable files={files} />
    </section>
  );
}
