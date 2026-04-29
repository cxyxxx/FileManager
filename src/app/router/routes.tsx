import type { ReactElement } from "react";
import { FileDetailPage } from "../../pages/file/FileDetailPage";
import { FilePage } from "../../pages/file/FilePage";
import { InboxPage } from "../../pages/inbox/InboxPage";
import { QueriesPage } from "../../pages/queries/QueriesPage";
import { SearchPage } from "../../pages/search/SearchPage";
import { SettingsPage } from "../../pages/settings/SettingsPage";
import { TagDetailPage } from "../../pages/tag/TagDetailPage";
import { TagPage } from "../../pages/tag/TagPage";

export type RouteParams = {
  fileId?: string;
  tagId?: string;
};

export type RouteMatch = {
  route: AppRoute;
  params: RouteParams;
};

export type AppRoute = {
  id: string;
  label: string;
  path: string;
  nav: boolean;
  render: (params: RouteParams) => ReactElement;
};

export const routes: AppRoute[] = [
  { id: "inbox", label: "Inbox", path: "/inbox", nav: true, render: () => <InboxPage /> },
  { id: "files", label: "Files", path: "/files", nav: true, render: () => <FilePage /> },
  {
    id: "file-detail",
    label: "File Detail",
    path: "/files/:fileId",
    nav: false,
    render: ({ fileId }) => <FileDetailPage fileId={fileId ?? ""} />,
  },
  { id: "tags", label: "Tags", path: "/tags", nav: true, render: () => <TagPage /> },
  {
    id: "tag-detail",
    label: "Tag Detail",
    path: "/tags/:tagId",
    nav: false,
    render: ({ tagId }) => <TagDetailPage tagId={tagId ?? ""} />,
  },
  { id: "queries", label: "Queries", path: "/queries", nav: true, render: () => <QueriesPage /> },
  { id: "search", label: "Search", path: "/search", nav: true, render: () => <SearchPage /> },
  { id: "settings", label: "Settings", path: "/settings", nav: true, render: () => <SettingsPage /> },
];

export function navigateTo(path: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, "", path);
  } else {
    window.history.pushState(null, "", path);
  }
  window.dispatchEvent(new Event("popstate"));
}

export function matchRoute(pathname: string): RouteMatch {
  const normalized = pathname === "/" ? "/inbox" : pathname.replace(/\/+$/, "") || "/inbox";
  const fileMatch = normalized.match(/^\/files\/([^/]+)$/);
  if (fileMatch) {
    return { route: routes.find((route) => route.id === "file-detail") ?? routes[0], params: { fileId: decodeURIComponent(fileMatch[1]) } };
  }
  const tagMatch = normalized.match(/^\/tags\/([^/]+)$/);
  if (tagMatch) {
    return { route: routes.find((route) => route.id === "tag-detail") ?? routes[0], params: { tagId: decodeURIComponent(tagMatch[1]) } };
  }
  const route = routes.find((item) => item.path === normalized.split("?")[0]) ?? routes[0];
  return { route, params: {} };
}
