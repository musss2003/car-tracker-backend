#!/bin/sh
set -e

echo "🔄 Running database migrations..."
if ! npm run migration:run; then
  echo "❌ Database migrations failed!"
  exit 1
fi

echo "✅ Migrations completed successfully"
echo "🚀 Starting application..."
exec "$@"
