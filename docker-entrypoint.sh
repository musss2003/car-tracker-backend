#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Running database migrations..."
  if ! npm run migration:run; then
    echo "❌ Database migrations failed!"
    exit 1
  fi
  echo "✅ Migrations completed successfully"
else
  echo "⚠️ Skipping database migrations (set RUN_MIGRATIONS=true to enable)"
fi
echo "🚀 Starting application..."

# Run node directly to see all errors
node dist/app.js 2>&1 || {
  echo "❌ Application crashed with exit code $?"
  exit 1
}
