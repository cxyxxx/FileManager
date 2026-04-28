# React Tauri Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first foundation layer for FilesManager with a React shell, Tauri command boundary, workspace initialization, SQLite migrations, domain rules, and feature API wrappers.

**Architecture:** React owns view state and command consumption. Rust owns workspace, filesystem, database, domain rules, and consistency-sensitive writes through services and repositories. Tauri commands are thin boundary adapters over Rust services.

**Tech Stack:** React, TypeScript, Vite, Tauri 2, Rust, rusqlite, serde, thiserror, uuid, sha2.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`

**Steps:**
1. Add Vite React and Tauri project metadata.
2. Add TypeScript and Vite configuration.
3. Add Tauri 2 configuration with `src-tauri` as the Rust app.
4. Run `npm install`.
5. Run `npm run build`.

### Task 2: Rust Domain Rules

**Files:**
- Create: `src-tauri/src/domain/errors.rs`
- Create: `src-tauri/src/domain/file.rs`
- Create: `src-tauri/src/domain/tag.rs`
- Create: `src-tauri/src/domain/version.rs`
- Create: `src-tauri/src/domain/query.rs`
- Create: `src-tauri/src/policies/tag_policy.rs`
- Create: `src-tauri/src/policies/inbox_policy.rs`
- Create: `src-tauri/src/policies/freeze_policy.rs`
- Create: `src-tauri/src/policies/aggregation_policy.rs`

**Steps:**
1. Write tests for tag cycle prevention, self-parent prevention, inbox unclassified detection, freeze mutation rejection, and aggregation deduplication.
2. Run `cargo test` and confirm the tests fail before implementation.
3. Implement the minimal domain and policy code.
4. Run `cargo test` and confirm the tests pass.

### Task 3: Workspace and Database

**Files:**
- Create: `src-tauri/src/app/state.rs`
- Create: `src-tauri/src/app/bootstrap.rs`
- Create: `src-tauri/src/db/connection.rs`
- Create: `src-tauri/src/db/migrations.rs`
- Create: `src-tauri/src/services/workspace_service.rs`
- Create: `src-tauri/src/infra/fs.rs`
- Create: `src-tauri/src/infra/hashing.rs`
- Create: `src-tauri/src/infra/clock.rs`
- Create: `src-tauri/src/infra/ids.rs`

**Steps:**
1. Add `AppState` with managed current workspace context.
2. Add workspace directory creation for `data`, `files`, `previews`, `temp`, and `logs`.
3. Add SQLite connection setup with PRAGMA initialization.
4. Add schema migration for files, tags, file tags, versions, and saved queries.
5. Add safe path helpers, hashing, clock, and ID helpers.

### Task 4: Repositories and Services

**Files:**
- Create: `src-tauri/src/repositories/file_repo.rs`
- Create: `src-tauri/src/repositories/tag_repo.rs`
- Create: `src-tauri/src/repositories/version_repo.rs`
- Create: `src-tauri/src/repositories/query_repo.rs`
- Create: `src-tauri/src/services/file_service.rs`
- Create: `src-tauri/src/services/tag_service.rs`
- Create: `src-tauri/src/services/version_service.rs`
- Create: `src-tauri/src/services/query_service.rs`
- Create: `src-tauri/src/services/settings_service.rs`

**Steps:**
1. Add repository CRUD/query functions only.
2. Add services that enforce rules before writes.
3. Keep filesystem import, tag binding, version derivation, inbox, and query operations in Rust.

### Task 5: Tauri Commands

**Files:**
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/workspace.rs`
- Create: `src-tauri/src/commands/files.rs`
- Create: `src-tauri/src/commands/tags.rs`
- Create: `src-tauri/src/commands/versions.rs`
- Create: `src-tauri/src/commands/queries.rs`
- Create: `src-tauri/src/commands/settings.rs`

**Steps:**
1. Register app state with `Builder.manage`.
2. Register commands with `tauri::generate_handler`.
3. Keep command functions thin and delegate to services.

### Task 6: React App Shell and Data Layer

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/app/router/routes.tsx`
- Create: `src/app/providers/WorkspaceProvider.tsx`
- Create: `src/app/layouts/AppLayout.tsx`
- Create: page and feature API files under `src/pages` and `src/features`.
- Create: `src/shared/types/domain.ts`
- Create: `src/shared/lib/tauri.ts`

**Steps:**
1. Add app layout with navigation for inbox, tags, files, versions, queries, and settings.
2. Add command wrappers in feature `api/` modules.
3. Add simple pages that consume the wrappers without embedding domain rules.
4. Run `npm run build`.

### Verification Notes

- Rust verification requires `cargo` and `rustc` to be installed or available in `PATH`.
- Node verification requires successful `npm install`.
- First verification targets: `cargo test`, `npm run build`.
