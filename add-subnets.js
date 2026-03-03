/**
 * Script to add App Subnet and Data Subnet to the current diagram
 * Run this in the browser console on the Konva POC page
 */

// Subnet definitions
const appSubnet = {
  id: 'subnet-app',
  position: { x: 0, y: 0 }, // Will be auto-calculated
  displayName: 'App Subnet',
  groupType: 'subnet',
  subtitle: '10.0.1.0/24',
  width: 900,
  height: 350,
  logicalParent: 'vnet-main', // Parent is the VNet
};

const dataSubnet = {
  id: 'subnet-data',
  position: { x: 0, y: 0 }, // Will be auto-calculated
  displayName: 'Data Subnet',
  groupType: 'subnet',
  subtitle: '10.0.2.0/24',
  width: 900,
  height: 350,
  logicalParent: 'vnet-main', // Parent is the VNet
};

// Services that should be in App Subnet (Compute tier)
const appSubnetServices = [
  'Orders Service',
  'Users Service',
  'Inventory Service',
  'Notification Service',
  'API Management',
];

// Services that should be in Data Subnet (Data tier)
const dataSubnetServices = [
  'Cosmos DB',
  'SQL Database',
  'Redis Cache',
  'Storage Account',
  'Service Bus',
];

console.log('📦 App Subnet services:', appSubnetServices);
console.log('💾 Data Subnet services:', dataSubnetServices);

console.log(`
To add the subnets:
1. Use the CopilotKit sidebar to ask the AI:
   "Create two subnet groups inside the VNet:
   - App Subnet (10.0.1.0/24) containing: Orders Service, Users Service, Inventory Service, Notification Service, API Management
   - Data Subnet (10.0.2.0/24) containing: Cosmos DB, SQL Database, Redis Cache, Storage Account, Service Bus"

2. The AI will create both subnet containers inside the VNet
3. The Resource Group will automatically expand to encompass everything
`);
