#!/usr/bin/env bash
set -e

echo "=== NutriTrack Verification ==="
echo ""

echo "[1/3] Linting..."
npm run lint
echo "  Lint: PASS"
echo ""

echo "[2/3] Tests..."
npm test
echo "  Tests: PASS"
echo ""

echo "[3/3] Build..."
npm run build
echo "  Build: PASS"
echo ""

echo "=== All checks passed ==="
