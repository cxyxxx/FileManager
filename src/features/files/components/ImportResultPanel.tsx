import type { FileRecord } from "../../../shared/types/domain";

export type ImportResultItem = {
  name: string;
  status: "success" | "failed" | "duplicate";
  file?: FileRecord;
  reason?: string;
};

type ImportResultPanelProps = {
  items: ImportResultItem[];
};

export function ImportResultPanel({ items }: ImportResultPanelProps) {
  if (items.length === 0) {
    return null;
  }
  const successCount = items.filter((item) => item.status === "success").length;
  const failedCount = items.length - successCount;

  return (
    <section className="import-result">
      <div className="section-title-row">
        <h3>导入结果</h3>
        <span className="muted">成功 {successCount} 个 · 失败 {failedCount} 个</span>
      </div>
      <div className="list-stack">
        {items.map((item, index) => (
          <div className="list-row" key={`${item.name}-${index}`}>
            <span>{item.file?.originalName ?? item.name}</span>
            <small className={item.status === "success" ? "success-inline" : "error-inline"}>
              {item.status === "success" ? "成功" : item.status === "duplicate" ? "重复" : "失败"}
              {item.reason ? ` · ${item.reason}` : ""}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
