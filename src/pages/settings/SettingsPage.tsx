import { useState } from "react";
import { useWorkspace } from "../../app/providers/WorkspaceProvider";

export function SettingsPage() {
  const { workspace, initialize } = useWorkspace();
  const [path, setPath] = useState(workspace?.rootPath ?? "");

  return (
    <section className="panel">
      <h2>Workspace</h2>
      <div className="toolbar">
        <input
          className="input"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="Workspace path"
        />
        <button className="button" type="button" onClick={() => initialize(path || undefined)}>
          Initialize
        </button>
      </div>
      <p className="empty-state">{workspace?.rootPath ?? "No workspace loaded."}</p>
    </section>
  );
}
