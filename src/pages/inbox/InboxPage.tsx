import { FileTable } from "../../features/files/components/FileTable";
import { useInboxFiles } from "../../features/files/hooks/useInboxFiles";

export function InboxPage() {
  const { files, loading, error, refresh } = useInboxFiles();

  return (
    <section className="panel">
      <div className="toolbar">
        <button className="button secondary" type="button" onClick={refresh}>
          Refresh
        </button>
      </div>
      {loading ? <p className="empty-state">Loading inbox files.</p> : null}
      {error ? <p className="empty-state">{error}</p> : null}
      {!loading && !error ? <FileTable files={files} /> : null}
    </section>
  );
}
