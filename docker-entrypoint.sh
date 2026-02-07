#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npm run migration:run || echo "⚠️  No migrations to run or migration failed"

echo "🚀 Starting application..."
exec "$@"
