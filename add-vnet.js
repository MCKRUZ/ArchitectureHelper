/**
 * Script to add VNet to the current diagram and assign nodes to it
 * Run this in the browser console on the Konva POC page
 */

// Step 1: Add the VNet group
console.log('Adding VNet...');

// You'll need to manually trigger this through the UI, or we can add a helper function
// For now, here's the structure of what we need:

const vnetGroup = {
  id: 'vnet-main',
  position: { x: 0, y: 0 }, // Will be auto-calculated
  displayName: 'Main Application VNet',
  groupType: 'virtual-network',
  subtitle: '10.0.0.0/16',
  width: 2000,
  height: 800,
};

// Step 2: Nodes that should be inside the VNet
const nodesInVNet = [
  'Orders Service',
  'Users Service',
  'Inventory Service',
  'Notification Service',
  'API Management',
  'SQL Database',
  'Cosmos DB',
  'Redis Cache',
  'Storage Account',
  'Service Bus',
];

console.log('Nodes to be assigned to VNet:', nodesInVNet);

// Instructions:
console.log(`
To add the VNet:
1. Use the "Add Group" button in the UI
2. Select "Virtual Network" as the group type
3. Name it "Main Application VNet"
4. Then assign the following services to it by dragging them into the VNet or using the properties panel
`);
