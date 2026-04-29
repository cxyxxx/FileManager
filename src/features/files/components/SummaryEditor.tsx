import { useEffect, useState } from "react";

type SummaryEditorProps = {
  summary?: string | null;
  saving?: boolean;
  error?: string | null;
  onSave: (summary: string) => Promise<void> | void;
};

export function SummaryEditor({ summary, saving = false, error, onSave }: SummaryEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary ?? "");

  useEffect(() => {
    if (!editing) {
      setDraft(summary ?? "");
    }
  }, [editing, summary]);

  async function save() {
    await onSave(draft);
    setEditing(false);
  }

  if (!editing) {
    return (
      <section className="content-section">
        <div className="section-title-row">
          <h3>摘要</h3>
          <button className="button secondary small" type="button" onClick={() => setEditing(true)}>
            编辑摘要
          </button>
        </div>
        <p className={summary?.trim() ? "summary-body" : "empty-state"}>{summary?.trim() || "暂无摘要"}</p>
      </section>
    );
  }

  return (
    <section className="content-section">
      <div className="section-title-row">
        <h3>摘要</h3>
        <div className="toolbar compact-actions">
          <button className="button secondary small" type="button" disabled={saving} onClick={() => setEditing(false)}>
            取消
          </button>
          <button className="button small" type="button" disabled={saving} onClick={save}>
            {saving ? "保存中..." : "保存摘要"}
          </button>
        </div>
      </div>
      <textarea
        className="textarea summary-editor"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="写下这个文件的用途、主题、关键结论或后续处理建议。"
      />
      {error ? <p className="error-text">保存失败：{error}</p> : null}
    </section>
  );
}
