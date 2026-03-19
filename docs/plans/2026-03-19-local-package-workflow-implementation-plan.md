# Local PageSpy Package Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let `lastos-pagespy` install and run a locally built `page-spy-api` package generated from the forked `page-spy-web` repo instead of waiting for an upstream npm release.

**Architecture:** Build the client bundle in `page-spy-web`, embed it into the forked backend binary, and assemble a small local npm package that exposes the `page-spy-api` bin entry. Point `lastos-pagespy` at that local package via a `file:` dependency and provide a sync script plus placeholder package so installation and startup behavior stay explicit.

**Tech Stack:** Yarn 1, Vite, Go, shell scripts, local `file:` npm dependencies

---

### Task 1: Add a local package builder in `page-spy-web`

**Files:**

- Create: `scripts/build-local-page-spy-api-package.sh`

**Step 1: Write the builder script**

Implement a shell script that:

- accepts an output directory argument
- builds the client with `yarn build:client`
- copies `dist` into `backend/dist`
- compiles `backend/main.go` into `bin/page-spy-api`
- writes a minimal `package.json` and `README.md` for the local package

**Step 2: Keep the builder configurable**

Support:

- `PAGE_SPY_API_PACKAGE_NAME`
- `PAGE_SPY_API_VERSION_SUFFIX`
- `GOOS`
- `GOARCH`

**Step 3: Verify script shape**

Run: `bash scripts/build-local-page-spy-api-package.sh /tmp/page-spy-api-local-check`

Expected:

- output directory contains `package.json`
- output directory contains `bin/page-spy-api`

### Task 2: Wire `lastos-pagespy` to the local package

**Files:**

- Modify: `package.json`
- Modify: `.gitignore`
- Create: `scripts/sync-local-page-spy-api.sh`
- Create: `vendor/page-spy-api-local/package.json`
- Create: `vendor/page-spy-api-local/README.md`
- Create: `vendor/page-spy-api-local/bin/page-spy-api`

**Step 1: Add the sync script**

Implement a wrapper that:

- resolves `PAGE_SPY_WEB_DIR` with default `../page-spy-web`
- calls the `page-spy-web` builder script
- writes the generated package into `vendor/page-spy-api-local`

**Step 2: Change dependency source**

Update `lastos-pagespy/package.json` so it depends on:

- `@lastos/page-spy-api` from `file:./vendor/page-spy-api-local`

Add scripts for:

- syncing the local package
- installing after sync

**Step 3: Add a placeholder package**

Create a placeholder local package so `yarn install` has a valid target before sync. The placeholder executable should print a clear message telling the user to run the sync script first.

### Task 3: Document the usage path

**Files:**

- Modify: `README.md`

**Step 1: Replace the current placeholder README**

Document:

- how to sync from the forked `page-spy-web`
- how to install dependencies
- how to start the service
- how to set `GOOS` / `GOARCH` or `PAGE_SPY_WEB_DIR` when needed

### Task 4: Verify the workflow

**Files:**

- Verify only

**Step 1: Run the sync script**

Run: `bash ./scripts/sync-local-page-spy-api.sh`

Expected:

- `vendor/page-spy-api-local/bin/page-spy-api` exists
- generated package metadata matches the local package name

**Step 2: Run dependency install**

Run: `yarn install`

Expected:

- local `file:` dependency resolves without registry changes

**Step 3: Smoke test startup**

Run: `yarn start --help`

Expected:

- the local packaged binary is invoked instead of the upstream npm package
