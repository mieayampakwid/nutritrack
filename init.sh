#!/usr/bin/env bash
set -e

echo "=== NutriTrack Verification ==="
echo ""

echo "[1/2] Linting..."
npm run lint
echo "  Lint: PASS"
echo ""

echo "[2/2] Tests..."
npm test
echo "  Tests: PASS"
echo ""

echo "=== All checks passed ==="
