#!/bin/bash
# =============================================================================
# Codespaces Setup Script - Minimal version
# =============================================================================

echo ""
echo "=============================================="
echo "  🚀 Setting up Azure SWA Fullstack Starter"
echo "=============================================="
echo ""

# Get workspace path (works in both Codespaces layouts)
WORKSPACE="/workspaces/azure-swa-fullstack-starter"
if [ ! -d "$WORKSPACE" ]; then
  WORKSPACE="/workspaces/$(basename $(pwd))"
fi

# Install SWA CLI
echo "📦 Installing SWA CLI..."
npm install -g @azure/static-web-apps-cli

# Install dependencies
echo "📦 Installing dependencies..."
cd "$WORKSPACE/app" && npm install
cd "$WORKSPACE/app/api" && npm install

# Start Cosmos DB Emulator
echo "🚀 Starting Cosmos DB emulator..."
docker run -d --name cosmos -p 8081:8081 -p 1234:1234 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview

# Create local.settings.json
echo "⚙️  Creating config..."
cat > "$WORKSPACE/app/api/local.settings.json" << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "COSMOS_DB_DATABASE_NAME": "appdb",
    "JWT_SECRET": "codespaces-demo-secret-minimum-32-chars",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  },
  "Host": { "CORS": "*" }
}
EOF

# Wait for emulator
echo "⏳ Waiting for Cosmos DB..."
for i in {1..60}; do
  if curl -ks https://localhost:8081/ > /dev/null 2>&1; then
    echo "✅ Cosmos DB ready!"
    cd "$WORKSPACE/app" && NODE_TLS_REJECT_UNAUTHORIZED=0 node ../scripts/seed-demo-data.js
    break
  fi
  sleep 2
  printf "\r   Waiting... %d/60" $i
done

echo ""
echo "=============================================="
echo "  ✅ Ready! Run: cd app && npm run dev:swa"
echo "=============================================="
echo "  Login: demo@example.com / Demo123!"
echo ""
