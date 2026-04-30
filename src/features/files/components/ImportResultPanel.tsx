import { navigateTo } from "../../../app/router/routes";
import type { ImportResultItem } from "../../../shared/types/domain";

type ImportResultPanelProps = {
  items: ImportResultItem[];
};

export function ImportResultPanel({ items }: ImportResultPanelProps) {
  if (items.length === 0) {
    return null;
  }
  const successCount = items.filter((item) => item.status === "success").length;
  const failedCount = items.filter((item) => item.status === "failed").length;
  const duplicateCount = items.filter((item) => item.status === "duplicate").length;

  return (
    <section className="import-result">
      <div className="section-title-row">
        <h3>导入结果</h3>
        <span className="muted">成功 {successCount} 个 · 失败 {failedCount} 个 · 重复 {duplicateCount} 个</span>
      </div>
      <div className="list-stack">
        {items.map((item, index) => (
          <div className="list-row import-result-row" key={`${item.path}-${index}`}>
            <div>
              <strong>{item.file?.originalName ?? item.originalName ?? item.path}</strong>
              <small className="muted-line">{item.path}</small>
              {item.reason ? <small className="error-inline">失败原因：{item.reason}</small> : null}
              {item.duplicateOf ? <small className="muted-line">已存在：{item.duplicateOf.originalName}</small> : null}
            </div>
            <div className="toolbar compact-actions">
              <span className={item.status === "success" ? "status-chip success" : item.status === "duplicate" ? "status-chip warning" : "status-chip danger"}>
                {item.status === "success" ? "成功" : item.status === "duplicate" ? "重复" : "失败"}
              </span>
              {item.file ? (
                <button className="button secondary small" type="button" onClick={() => navigateTo(`/files/${encodeURIComponent(item.file!.id)}`)}>
                  查看文件
                </button>
              ) : null}
              {item.duplicateOf ? (
                <button className="button secondary small" type="button" onClick={() => navigateTo(`/files/${encodeURIComponent(item.duplicateOf!.id)}`)}>
                  查看已存在
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
