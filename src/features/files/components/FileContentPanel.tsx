import { useEffect, useState } from "react";
import type { FileContent } from "../../../shared/types/domain";
import { extractFileContent, getFileContent, reextractFileContent } from "../api/filesApi";

type FileContentPanelProps = {
  fileId: string;
  onExtracted?: () => void;
};

const PREVIEW_LIMIT = 3000;

export function FileContentPanel({ fileId, onExtracted }: FileContentPanelProps) {
  const [content, setContent] = useState<FileContent | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = content?.contentText ?? "";
  const visibleText = expanded ? text : text.slice(0, PREVIEW_LIMIT);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFileContent(fileId)
      .then((next) => {
        if (!cancelled) setContent(next);
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

  async function run(action: "extract" | "reextract") {
    setActing(true);
    setError(null);
    try {
      const next = action === "extract" ? await extractFileContent(fileId) : await reextractFileContent(fileId);
      setContent(next);
      await onExtracted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  }

  async function copyText() {
    await navigator.clipboard?.writeText(text);
  }

  return (
    <section className="content-section">
      <div className="section-title-row">
        <h3>内容</h3>
        <div className="toolbar compact-actions">
          <button className="button secondary small" type="button" disabled={acting} onClick={() => void run("extract")}>
            {acting ? "处理中..." : "抽取"}
          </button>
          <button className="button secondary small" type="button" disabled={acting} onClick={() => void run("reextract")}>
            重新抽取
          </button>
        </div>
      </div>
      {loading ? <p className="empty-state">正在读取抽取状态...</p> : null}
      {content ? <p className="muted">状态：{statusLabel(content.extractionStatus)}</p> : null}
      {content?.extractionStatus === "pending" ? <p className="empty-state">尚未抽取内容</p> : null}
      {content?.extractionStatus === "unsupported" ? <p className="empty-state">该格式暂不支持内容抽取</p> : null}
      {content?.extractionStatus === "failed" ? <p className="error-text">抽取失败：{content.extractionError ?? "未知错误"}</p> : null}
      {content?.extractionStatus === "success" ? (
        <>
          <pre className="text-preview">{visibleText}</pre>
          <div className="toolbar">
            {text.length > PREVIEW_LIMIT ? (
              <button className="button secondary small" type="button" onClick={() => setExpanded(!expanded)}>
                {expanded ? "收起" : "展开全文"}
              </button>
            ) : null}
            <button className="button secondary small" type="button" onClick={() => void copyText()}>
              复制文本
            </button>
          </div>
        </>
      ) : null}
      {error ? <p className="error-text">操作失败：{error}</p> : null}
    </section>
  );
}

function statusLabel(status: FileContent["extractionStatus"]) {
  return {
    pending: "未抽取",
    success: "已抽取",
    failed: "失败",
    unsupported: "不支持",
  }[status];
}
