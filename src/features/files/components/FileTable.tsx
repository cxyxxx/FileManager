import type { FileRecord } from "../../../shared/types/domain";

export function FileTable({ files }: { files: FileRecord[] }) {
  if (files.length === 0) {
    return <p className="empty-state">No files found.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Hash</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id}>
            <td>{file.originalName}</td>
            <td>{file.status}</td>
            <td>{file.sha256.slice(0, 12)}</td>
            <td>{file.updatedAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
