import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary } from "./app/errors/AppErrorBoundary";
import "./styles.css";

try {
  (window as Window & { __setBootStatus?: (message: string) => void }).__setBootStatus?.("React entry loaded; mounting app.");

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element #root was not found.");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>,
  );
} catch (error) {
  const reporter = (window as Window & { __showBootError?: (error: unknown) => void }).__showBootError;
  if (reporter) {
    reporter(error);
  } else {
    throw error;
  }
}
