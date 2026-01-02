#!/bin/bash
# =============================================================================
# Codespaces/DevContainer Setup Script
# =============================================================================
# Runs automatically when the container is created.
# Sets up dependencies and seeds demo data.
# =============================================================================

set -e

echo ""
echo "=============================================="
echo "  🚀 Setting up Azure SWA Fullstack Starter"
echo "=============================================="
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspace/app
npm install

# Install API dependencies
echo "📦 Installing API dependencies..."
cd /workspace/app/api
npm install

# Create local.settings.json for API
echo "⚙️  Creating API configuration..."
cat > /workspace/app/api/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "AccountEndpoint=https://cosmosdb:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
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

# Wait for Cosmos DB to be fully ready
echo "⏳ Waiting for Cosmos DB emulator..."
MAX_ATTEMPTS=60
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -k -s https://cosmosdb:8081/_explorer/emulator.pem > /dev/null 2>&1; then
        echo "✓ Cosmos DB emulator is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "⚠️  Cosmos DB emulator not ready yet. You can run 'npm run seed:demo' manually later."
else
    # Seed demo data
    echo "🌱 Seeding demo data..."
    cd /workspace/app
    # Update the seed script to use the correct host
    COSMOS_DB_CONNECTION_STRING="AccountEndpoint=https://cosmosdb:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==" \
    NODE_TLS_REJECT_UNAUTHORIZED=0 \
    node ../scripts/seed-demo-data.js
fi

echo ""
echo "=============================================="
echo "  ✅ Setup complete!"
echo "=============================================="
echo ""
echo "  To start the application, run:"
echo "    cd app && npm run dev:swa"
echo ""
echo "  Then open the forwarded port 5173"
echo ""
echo "  Demo logins:"
echo "    Admin:  demo@example.com / Demo123!"
echo "    Worker: sarah.wilson@example.com / Worker123!"
echo ""
