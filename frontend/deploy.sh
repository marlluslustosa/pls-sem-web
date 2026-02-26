#!/bin/bash

echo "🏗️  Building frontend..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not created"
  exit 1
fi

echo "✅ Build completed"
echo ""
echo "📦 Deploying to Netlify..."
netlify deploy --prod --dir=dist

echo ""
echo "✅ Deployment complete!"
