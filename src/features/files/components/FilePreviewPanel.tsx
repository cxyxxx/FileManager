import { useEffect, useState } from "react";
import type { FilePreview } from "../../../shared/types/domain";
import { getFilePreview, openFile } from "../api/filesApi";

export function FilePreviewPanel({ fileId }: { fileId: string }) {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFilePreview(fileId)
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  return (
    <section className="content-section">
      <div className="section-title-row">
        <h3>文件预览</h3>
        <button className="button secondary small" type="button" onClick={() => void openFile(fileId)}>
          外部打开
        </button>
      </div>
      {loading ? <p className="empty-state">正在加载预览...</p> : null}
      {preview?.previewType === "text" ? <pre className="text-preview">{preview.text || "暂无可预览文本"}</pre> : null}
      {preview?.previewType === "image" ? (
        <div className="empty-block">
          <strong>图片文件</strong>
          <span>{preview.imageUrl ?? "当前环境无法直接渲染图片路径，可使用外部打开查看。"}</span>
        </div>
      ) : null}
      {preview?.previewType === "unsupported" ? <p className="empty-state">该格式暂不支持内置预览</p> : null}
      {preview?.error ? <p className="error-text">预览失败：{preview.error}</p> : null}
      {error ? <p className="error-text">预览失败：{error}</p> : null}
    </section>
  );
}
