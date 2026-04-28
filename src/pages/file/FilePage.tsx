import { FormEvent, useState } from "react";
import { importFiles } from "../../features/files/api/filesApi";
import { FileTable } from "../../features/files/components/FileTable";
import type { FileRecord } from "../../shared/types/domain";

export function FilePage() {
  const [pathsText, setPathsText] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onImport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const paths = pathsText
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean);
    if (paths.length === 0) {
      return;
    }
    try {
      setFiles(await importFiles(paths));
      setPathsText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="panel">
      <form className="toolbar" onSubmit={onImport}>
        <input
          className="input"
          value={pathsText}
          onChange={(event) => setPathsText(event.target.value)}
          placeholder="One file path per line"
        />
        <button className="button" type="submit">
          Import
        </button>
      </form>
      {error ? <p className="empty-state">{error}</p> : null}
      <FileTable files={files} />
    </section>
  );
}
