import { invoke } from "@tauri-apps/api/core";

export async function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!hasTauriInvoke()) {
    throw new Error("Tauri IPC 不可用。请通过 Tauri 桌面窗口启动应用，而不是直接在浏览器中打开 Vite 页面。");
  }

  try {
    return await invoke<T>(name, args);
  } catch (error) {
    if (typeof error === "object" && error && "message" in error) {
      throw new Error(String((error as { message: unknown }).message));
    }
    throw new Error(String(error));
  }
}

function hasTauriInvoke() {
  if (typeof window === "undefined") {
    return false;
  }
  const tauriWindow = window as Window & {
    __TAURI_INTERNALS__?: {
      invoke?: unknown;
    };
  };
  return typeof tauriWindow !== "undefined" && typeof tauriWindow.__TAURI_INTERNALS__?.invoke === "function";
}
