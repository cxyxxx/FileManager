import { AppLayout } from "./app/layouts/AppLayout";
import { useWorkspace, WorkspaceProvider } from "./app/providers/WorkspaceProvider";
import { routes } from "./app/router/routes";

export function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceGate />
    </WorkspaceProvider>
  );
}

function WorkspaceGate() {
  const { workspace, loading, error, initialize } = useWorkspace();

  if (loading && !workspace) {
    return (
      <main className="init-screen">
        <h1>File Manager</h1>
        <p>正在初始化 workspace...</p>
      </main>
    );
  }

  if (error && !workspace) {
    return (
      <main className="init-screen">
        <h1>初始化失败</h1>
        <p>{error}</p>
        <button className="button" type="button" onClick={() => initialize()}>
          重试
        </button>
      </main>
    );
  }

  return <AppLayout routes={routes} />;
}
