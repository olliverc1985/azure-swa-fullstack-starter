#!/usr/bin/env node
/**
 * Create Admin User Script
 * 
 * Creates the initial admin user in the database.
 * Run this after deploying the infrastructure for the first time.
 * 
 * Usage:
 *   COSMOS_DB_CONNECTION_STRING="your-connection-string" node scripts/create-admin-user.js
 * 
 * Or with custom email/password:
 *   COSMOS_DB_CONNECTION_STRING="..." node scripts/create-admin-user.js admin@example.com MySecurePass123!
 */

const { CosmosClient } = require('@azure/cosmos');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const DATABASE_NAME = process.env.COSMOS_DB_DATABASE_NAME || 'appdb';
const CONTAINER_NAME = 'users';

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createAdminUser() {
  console.log('\n🔧 Admin User Creation Script\n');

  // Get connection string
  const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
  if (!connectionString) {
    console.error('❌ Error: COSMOS_DB_CONNECTION_STRING environment variable is required');
    console.log('\nSet it using:');
    console.log('  export COSMOS_DB_CONNECTION_STRING="AccountEndpoint=...;AccountKey=..."');
    console.log('\nOr get it from Azure:');
    console.log('  az cosmosdb keys list --name YOUR_COSMOS_ACCOUNT --resource-group YOUR_RG --type connection-strings');
    process.exit(1);
  }

  // Get user details
  let email = process.argv[2];
  let password = process.argv[3];
  let firstName = process.argv[4] || 'Admin';
  let lastName = process.argv[5] || 'User';

  if (!email) {
    email = await prompt('Enter admin email: ');
  }

  if (!password) {
    password = await prompt('Enter admin password (min 8 chars, must include letter and number): ');
  }

  // Validate inputs
  email = email.toLowerCase().trim();
  
  if (!email.includes('@')) {
    console.error('❌ Invalid email address');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    process.exit(1);
  }

  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    console.error('❌ Password must contain at least one letter and one number');
    process.exit(1);
  }

  try {
    console.log('\n📡 Connecting to Cosmos DB...');
    const client = new CosmosClient(connectionString);
    const database = client.database(DATABASE_NAME);
    const container = database.container(CONTAINER_NAME);

    // Check if user already exists
    console.log('🔍 Checking for existing user...');
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }],
      })
      .fetchAll();

    if (resources.length > 0) {
      console.log(`\n⚠️  User already exists: ${email}`);
      console.log('   Use the application to manage existing users.');
      process.exit(0);
    }

    // Create user
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    const now = new Date().toISOString();
    const user = {
      id: uuidv4(),
      email,
      firstName,
      lastName,
      role: 'admin',
      passwordHash,
      tokenVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    console.log('💾 Creating admin user...');
    await container.items.create(user);

    console.log('\n✅ Admin user created successfully!\n');
    console.log('   Email:', email);
    console.log('   Name:', `${firstName} ${lastName}`);
    console.log('   Role: admin');
    console.log('\n⚠️  Store the password securely - it cannot be retrieved later.');
    console.log('   You can change it after logging in via Settings.\n');
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    
    if (error.code === 'NotFound') {
      console.log('\n💡 The database or container may not exist.');
      console.log('   Run the deployment pipeline first, or create them manually.');
    }
    
    process.exit(1);
  }
}

createAdminUser();
