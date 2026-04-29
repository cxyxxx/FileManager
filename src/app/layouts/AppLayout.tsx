import { useEffect, useMemo, useState } from "react";
import { matchRoute, navigateTo, type AppRoute } from "../router/routes";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { SearchBar } from "../../features/search/components/SearchBar";

export function AppLayout({ routes }: { routes: AppRoute[] }) {
  const [locationKey, setLocationKey] = useState(window.location.pathname + window.location.search);
  const { workspace, loading, error } = useWorkspace();

  useEffect(() => {
    if (window.location.pathname === "/") {
      navigateTo("/inbox", true);
    }
    const onPopState = () => setLocationKey(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const pathname = window.location.pathname;
  const activeMatch = useMemo(() => matchRoute(pathname), [pathname]);
  const navRoutes = routes.filter((route) => route.nav);

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
          {navRoutes.map((route) => (
            <button
              className={isActiveNav(route.path, pathname) ? "nav-item active" : "nav-item"}
              key={route.id}
              type="button"
              onClick={() => navigateTo(route.path)}
            >
              {route.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{activeMatch.route.label}</h1>
            <p>{workspace?.rootPath ?? "Workspace is being initialized"}</p>
          </div>
          <SearchBar initialValue={new URLSearchParams(window.location.search).get("q") ?? ""} />
          <div className={loading ? "status loading" : error ? "status error" : "status"}>
            {loading ? "Loading" : error ?? "Ready"}
          </div>
        </header>
        <div key={locationKey}>{activeMatch.route.render(activeMatch.params)}</div>
      </main>
    </div>
  );
}

function isActiveNav(routePath: string, pathname: string) {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}
