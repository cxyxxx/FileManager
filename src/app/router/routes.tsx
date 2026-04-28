import type { ReactElement } from "react";
import { FilePage } from "../../pages/file/FilePage";
import { InboxPage } from "../../pages/inbox/InboxPage";
import { QueriesPage } from "../../pages/queries/QueriesPage";
import { SettingsPage } from "../../pages/settings/SettingsPage";
import { TagPage } from "../../pages/tag/TagPage";
import { VersionsPage } from "../../pages/versions/VersionsPage";

export type AppRoute = {
  id: string;
  label: string;
  element: ReactElement;
};

export const routes: AppRoute[] = [
  { id: "inbox", label: "Inbox", element: <InboxPage /> },
  { id: "tag", label: "Tags", element: <TagPage /> },
  { id: "file", label: "Files", element: <FilePage /> },
  { id: "versions", label: "Versions", element: <VersionsPage /> },
  { id: "queries", label: "Queries", element: <QueriesPage /> },
  { id: "settings", label: "Settings", element: <SettingsPage /> },
];
