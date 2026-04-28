import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WorkspaceInfo } from "../../shared/types/domain";
import { getWorkspaceInfo, initWorkspace } from "../../features/workspace/api/workspaceApi";

type WorkspaceContextValue = {
  workspace: WorkspaceInfo | null;
  loading: boolean;
  error: string | null;
  initialize: (path?: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await initWorkspace(path);
      setWorkspace(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getWorkspaceInfo()
      .then(setWorkspace)
      .catch(() => initialize())
      .finally(() => setLoading(false));
  }, [initialize]);

  const value = useMemo(
    () => ({ workspace, loading, error, initialize }),
    [workspace, loading, error, initialize],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return value;
}
