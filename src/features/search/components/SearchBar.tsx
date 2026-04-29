import { FormEvent, useState } from "react";
import { navigateTo } from "../../../app/router/routes";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (query) {
      navigateTo(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <form className="global-search" onSubmit={onSubmit}>
      <input
        className="input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索文件、摘要、tag"
      />
      <button className="button secondary" type="submit">
        搜索
      </button>
    </form>
  );
}
