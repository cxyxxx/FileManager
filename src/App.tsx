import { AppLayout } from "./app/layouts/AppLayout";
import { WorkspaceProvider } from "./app/providers/WorkspaceProvider";
import { routes } from "./app/router/routes";

export function App() {
  return (
    <WorkspaceProvider>
      <AppLayout routes={routes} />
    </WorkspaceProvider>
  );
}
