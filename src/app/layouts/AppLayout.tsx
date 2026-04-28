import { useMemo, useState } from "react";
import type { AppRoute } from "../router/routes";
import { useWorkspace } from "../providers/WorkspaceProvider";

export function AppLayout({ routes }: { routes: AppRoute[] }) {
  const [activeRouteId, setActiveRouteId] = useState(routes[0]?.id ?? "inbox");
  const { workspace, loading, error } = useWorkspace();

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) ?? routes[0],
    [activeRouteId, routes],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">FM</span>
          <div>
            <strong>FilesManager</strong>
            <span>{workspace ? "Workspace ready" : "Starting"}</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {routes.map((route) => (
            <button
              className={route.id === activeRoute.id ? "nav-item active" : "nav-item"}
              key={route.id}
              type="button"
              onClick={() => setActiveRouteId(route.id)}
            >
              {route.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{activeRoute.label}</h1>
            <p>{workspace?.rootPath ?? "Workspace is being initialized"}</p>
          </div>
          <div className={loading ? "status loading" : error ? "status error" : "status"}>
            {loading ? "Loading" : error ?? "Ready"}
          </div>
        </header>
        {activeRoute.element}
      </main>
    </div>
  );
}
