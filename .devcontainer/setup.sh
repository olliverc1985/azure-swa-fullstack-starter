#!/bin/bash
# =============================================================================
# Codespaces Setup Script
# =============================================================================

echo ""
echo "=============================================="
echo "  🚀 Setting up Azure SWA Fullstack Starter"
echo "=============================================="
echo ""

# Install SWA CLI
echo "📦 Installing Azure Static Web Apps CLI..."
npm install -g @azure/static-web-apps-cli

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspaces/azure-swa-fullstack-starter/app
npm install

# Install API dependencies
echo "📦 Installing API dependencies..."
cd /workspaces/azure-swa-fullstack-starter/app/api
npm install

# Start Cosmos DB Emulator
echo "🚀 Starting Cosmos DB emulator..."
docker pull mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview
docker run -d --name cosmos-emulator -p 8081:8081 -p 1234:1234 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview

# Create local.settings.json for API
echo "⚙️  Creating API configuration..."
cat > /workspaces/azure-swa-fullstack-starter/app/api/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "COSMOS_DB_DATABASE_NAME": "appdb",
    "JWT_SECRET": "devcontainer-demo-secret-minimum-32-characters",
    "NODE_TLS_REJECT_UNAUTHORIZED": "0"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
EOF

# Wait for Cosmos DB to be ready
echo "⏳ Waiting for Cosmos DB emulator to be ready..."
echo "   (This can take 1-2 minutes)"

MAX_ATTEMPTS=60
ATTEMPT=0
READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -k -s https://localhost:8081/_explorer/emulator.pem > /dev/null 2>&1; then
        echo ""
        echo "✅ Cosmos DB emulator is ready!"
        READY=true
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    printf "\r   Waiting... (%d/%d)" $ATTEMPT $MAX_ATTEMPTS
    sleep 2
done

echo ""

if [ "$READY" = true ]; then
    # Seed demo data
    echo "🌱 Seeding demo data..."
    cd /workspaces/azure-swa-fullstack-starter/app
    NODE_TLS_REJECT_UNAUTHORIZED=0 node ../scripts/seed-demo-data.js
else
    echo "⚠️  Cosmos DB emulator not ready yet."
    echo "   You can seed data manually later with:"
    echo "   cd app && npm run seed:demo"
fi

echo ""
echo "=============================================="
echo "  ✅ Setup complete!"
echo "=============================================="
echo ""
echo "  To start the application, run:"
echo "    cd app && npm run dev:swa"
echo ""
echo "  Demo logins:"
echo "    Admin:  demo@example.com / Demo123!"
echo "    Worker: sarah.wilson@example.com / Worker123!"
echo ""
