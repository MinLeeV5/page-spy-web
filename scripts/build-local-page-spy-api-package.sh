#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUTPUT_DIR_INPUT="${1:-}"

if [[ -z "${OUTPUT_DIR_INPUT}" ]]; then
  echo "Usage: bash scripts/build-local-page-spy-api-package.sh <output-dir>" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR_INPUT}"
OUTPUT_DIR=$(cd "${OUTPUT_DIR_INPUT}" && pwd)

PACKAGE_NAME="${PAGE_SPY_API_PACKAGE_NAME:-@lastos/page-spy-api}"
VERSION_SUFFIX="${PAGE_SPY_API_VERSION_SUFFIX:-}"
GO_BINARY="${GO_BINARY:-$(command -v go || true)}"

cd "${ROOT_DIR}"

if [[ -z "${GO_BINARY}" ]]; then
  echo "Go toolchain not found. Install Go or set GO_BINARY to a valid Go executable path." >&2
  exit 1
fi

BASE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_VERSION="${BASE_VERSION}${VERSION_SUFFIX}"
TARGET_GOOS="${GOOS:-$("${GO_BINARY}" env GOOS)}"
TARGET_GOARCH="${GOARCH:-$("${GO_BINARY}" env GOARCH)}"

echo "Building page-spy-web client bundle..."
yarn build:client

echo "Embedding client bundle into backend/dist..."
rm -rf "${ROOT_DIR}/backend/dist"
cp -r "${ROOT_DIR}/dist" "${ROOT_DIR}/backend/dist"

mkdir -p "${OUTPUT_DIR}/bin" "${OUTPUT_DIR}/generated"

cat > "${OUTPUT_DIR}/package.json" <<EOF
{
  "name": "${PACKAGE_NAME}",
  "version": "${PACKAGE_VERSION}",
  "description": "Local PageSpy API package built from a forked page-spy-web workspace.",
  "bin": {
    "page-spy-api": "bin/page-spy-api"
  },
  "license": "MIT"
}
EOF

cat > "${OUTPUT_DIR}/README.md" <<EOF
# ${PACKAGE_NAME}

This package is generated locally from the forked \`page-spy-web\` workspace.

- Source version: ${BASE_VERSION}
- Target platform: ${TARGET_GOOS}/${TARGET_GOARCH}

Rebuild this package after changing the client or backend implementation.
EOF

cat > "${OUTPUT_DIR}/bin/page-spy-api" <<'EOF'
#!/usr/bin/env bash

set -euo pipefail

SOURCE_PATH="${BASH_SOURCE[0]}"

while [ -L "${SOURCE_PATH}" ]; do
  SCRIPT_DIR=$(cd "$(dirname "${SOURCE_PATH}")" && pwd)
  SOURCE_PATH=$(readlink "${SOURCE_PATH}")
  [[ "${SOURCE_PATH}" != /* ]] && SOURCE_PATH="${SCRIPT_DIR}/${SOURCE_PATH}"
done

SCRIPT_DIR=$(cd "$(dirname "${SOURCE_PATH}")" && pwd)
PACKAGE_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
GENERATED_BIN="${PACKAGE_DIR}/generated/page-spy-api"

if [[ ! -x "${GENERATED_BIN}" ]]; then
  echo "Local PageSpy binary is missing. Rebuild the local package before starting the service." >&2
  exit 1
fi

exec "${GENERATED_BIN}" "$@"
EOF

chmod +x "${OUTPUT_DIR}/bin/page-spy-api"

echo "Building backend binary for ${TARGET_GOOS}/${TARGET_GOARCH}..."
(
  cd "${ROOT_DIR}/backend"
  env GOOS="${TARGET_GOOS}" GOARCH="${TARGET_GOARCH}" CGO_ENABLED=0 \
    "${GO_BINARY}" build -o "${OUTPUT_DIR}/generated/page-spy-api" .
)

chmod +x "${OUTPUT_DIR}/generated/page-spy-api"

echo "Local package generated at ${OUTPUT_DIR}"
