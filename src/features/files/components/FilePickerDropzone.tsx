import { useEffect, useRef, useState, type DragEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import { selectFiles, selectFolder } from "../api/filesApi";

type FilePickerDropzoneProps = {
  disabled?: boolean;
  onImport: (paths: string[]) => void;
};

type TauriDropPayload = {
  paths?: string[];
};

export function FilePickerDropzone({ disabled = false, onImport }: FilePickerDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    listen<TauriDropPayload>("tauri://drag-drop", (event) => {
      if (disposed) {
        return;
      }
      const paths = event.payload.paths ?? [];
      if (paths.length > 0) {
        setMessage(`准备导入 ${paths.length} 个文件`);
        onImport(paths);
      }
      setDragging(false);
    }).then((dispose) => {
      unlisten = dispose;
    }).catch(() => {
      unlisten = undefined;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [onImport]);

  async function chooseFiles() {
    const paths = await selectFiles();
    if (paths.length === 0) {
      setMessage("当前运行环境未返回文件路径，可使用下方高级导入。");
      return;
    }
    setMessage(`准备导入 ${paths.length} 个文件`);
    onImport(paths);
  }

  async function chooseFolder() {
    const paths = await selectFolder();
    if (paths.length === 0) {
      setMessage("当前运行环境未返回文件路径，可使用下方高级导入。");
      return;
    }
    setMessage(`准备导入文件夹中的 ${paths.length} 个文件`);
    onImport(paths);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((path): path is string => Boolean(path));
    if (paths.length > 0) {
      setMessage(`准备导入 ${paths.length} 个文件`);
      onImport(paths);
    } else {
      setMessage("没有拿到文件路径，可尝试 Tauri 窗口拖拽或高级导入。");
    }
    setDragging(false);
  }

  return (
    <div
      ref={dropRef}
      className={dragging ? "dropzone active" : "dropzone"}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <strong>拖拽文件到这里</strong>
      <span>也可以直接选择文件夹，递归导入其中所有文件</span>
      <div className="toolbar compact-actions">
        <button className="button" type="button" disabled={disabled} onClick={chooseFiles}>
          选择文件
        </button>
        <button className="button secondary" type="button" disabled={disabled} onClick={chooseFolder}>
          选择文件夹
        </button>
      </div>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
