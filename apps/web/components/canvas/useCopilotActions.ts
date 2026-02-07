'use client';

import { useRef } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { generateId } from '@/lib/utils';
import { calculateTierBasedPosition, calculateAutoLayout } from '@/lib/layout/autoLayout';
import type { AzureServiceType, AzureServiceCategory, DiagramState, AzureNode, AzureEdge, GroupType } from '@/lib/state/types';

// Map service types to categories
const SERVICE_CATEGORIES: Record<AzureServiceType, AzureServiceCategory> = {
  'app-service': 'compute',
  'function-app': 'compute',
  'virtual-machine': 'compute',
  'container-apps': 'containers',
  'aks': 'containers',
  'azure-sql': 'databases',
  'cosmos-db': 'databases',
  'storage-account': 'storage',
  'redis-cache': 'databases',
  'virtual-network': 'networking',
  'application-gateway': 'networking',
  'load-balancer': 'networking',
  'front-door': 'networking',
  'key-vault': 'security',
  'api-management': 'integration',
  'service-bus': 'messaging',
  'event-hub': 'messaging',
  'azure-openai': 'ai-ml',
  'entra-id': 'identity',
  'log-analytics': 'management',
  'resource-group': 'management',
};

const VALID_SERVICE_TYPES: AzureServiceType[] = [
  'app-service', 'function-app', 'virtual-machine', 'container-apps', 'aks',
  'azure-sql', 'cosmos-db', 'storage-account', 'redis-cache', 'virtual-network',
  'application-gateway', 'load-balancer', 'front-door', 'key-vault', 'api-management',
  'service-bus', 'event-hub', 'azure-openai', 'entra-id', 'log-analytics'
];

const VALID_GROUP_TYPES: GroupType[] = ['resource-group', 'virtual-network', 'subnet'];

interface UseCopilotActionsProps {
  state: DiagramState;
  addNode: (node: AzureNode) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: AzureEdge) => void;
  clearDiagram: () => void;
  updateNodesPositions: (updates: Array<{ id: string; position: { x: number; y: number } }>) => void;
  addGroup: (group: {
    id: string;
    position: { x: number; y: number };
    displayName: string;
    groupType: GroupType;
    subtitle?: string;
    width?: number;
    height?: number;
  }) => void;
  assignNodeToGroup: (nodeId: string, groupId: string) => void;
  removeGroup: (groupId: string) => void;
}

/**
 * Hook to register CopilotKit actions for diagram manipulation
 */
export function useCopilotActions({
  state,
  addNode,
  removeNode,
  addEdge,
  clearDiagram,
  updateNodesPositions,
  addGroup,
  assignNodeToGroup,
  removeGroup,
}: UseCopilotActionsProps) {
  // Use refs to always have access to latest state/functions in handlers
  const stateRef = useRef(state);
  const addNodeRef = useRef(addNode);
  const removeNodeRef = useRef(removeNode);
  const addEdgeRef = useRef(addEdge);
  const clearDiagramRef = useRef(clearDiagram);
  const updateNodesPositionsRef = useRef(updateNodesPositions);
  const addGroupRef = useRef(addGroup);
  const assignNodeToGroupRef = useRef(assignNodeToGroup);
  const removeGroupRef = useRef(removeGroup);

  // Update refs on each render
  stateRef.current = state;
  addNodeRef.current = addNode;
  removeNodeRef.current = removeNode;
  addEdgeRef.current = addEdge;
  clearDiagramRef.current = clearDiagram;
  updateNodesPositionsRef.current = updateNodesPositions;
  addGroupRef.current = addGroup;
  assignNodeToGroupRef.current = assignNodeToGroup;
  removeGroupRef.current = removeGroup;

  // Make diagram state readable by the AI (including groups)
  useCopilotReadable({
    description: 'The current Azure architecture diagram state',
    value: {
      nodes: state.nodes.map(n => ({
        id: n.id,
        type: n.type,
        serviceType: n.data.serviceType,
        displayName: n.data.displayName,
        category: n.data.category,
        position: n.position,
        parentId: n.parentId,
        groupType: n.data.groupType,
      })),
      edges: state.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        connectionType: e.data?.connectionType,
      })),
      groups: state.nodes
        .filter(n => n.type === 'group')
        .map(n => ({
          id: n.id,
          displayName: n.data.displayName,
          groupType: n.data.groupType,
          childCount: state.nodes.filter(c => c.parentId === n.id).length,
        })),
      totalServices: state.nodes.filter(n => n.type !== 'group').length,
      totalGroups: state.nodes.filter(n => n.type === 'group').length,
      totalConnections: state.edges.length,
    },
  });

  // Action to add a service to the canvas with tier-based positioning
  useCopilotAction({
    name: 'addAzureService',
    description: 'Add an Azure service to the architecture diagram canvas. Services are automatically positioned based on their tier (Security/Identity -> Networking -> Compute -> Data).',
    parameters: [
      {
        name: 'serviceType',
        type: 'string',
        description: `The type of Azure service. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
        required: true,
      },
      {
        name: 'displayName',
        type: 'string',
        description: 'A friendly display name for this service instance',
        required: true,
      },
      {
        name: 'x',
        type: 'number',
        description: 'Optional X position on the canvas. If not provided, tier-based auto-positioning is used.',
        required: false,
      },
      {
        name: 'y',
        type: 'number',
        description: 'Optional Y position on the canvas. If not provided, tier-based auto-positioning is used.',
        required: false,
      },
    ],
    handler: async ({ serviceType, displayName, x, y }) => {
      const validType = serviceType as AzureServiceType;
      if (!VALID_SERVICE_TYPES.includes(validType)) {
        return `Invalid service type: ${serviceType}. Valid types are: ${VALID_SERVICE_TYPES.join(', ')}`;
      }

      const category = SERVICE_CATEGORIES[validType];
      const currentState = stateRef.current;

      let position: { x: number; y: number };
      if (x !== undefined && y !== undefined) {
        position = { x, y };
      } else {
        position = calculateTierBasedPosition(category, currentState.nodes);
      }

      const newNode: AzureNode = {
        id: generateId(),
        type: 'azureService',
        position,
        data: {
          serviceType: validType,
          displayName,
          category,
          status: 'proposed',
          properties: {},
        },
      };

      addNodeRef.current(newNode);
      return `Added ${displayName} (${serviceType}) to the canvas at position (${position.x}, ${position.y}) in the ${category} tier`;
    },
  });

  // Action to connect two services
  useCopilotAction({
    name: 'connectServices',
    description: 'Create a connection between two Azure services in the diagram',
    parameters: [
      {
        name: 'sourceServiceName',
        type: 'string',
        description: 'The display name of the source service',
        required: true,
      },
      {
        name: 'targetServiceName',
        type: 'string',
        description: 'The display name of the target service',
        required: true,
      },
      {
        name: 'connectionType',
        type: 'string',
        description: 'The type of connection: public, private-endpoint, vnet-integration, service-endpoint, or peering. Defaults to public.',
        required: false,
      },
      {
        name: 'isEncrypted',
        type: 'boolean',
        description: 'Whether the connection is encrypted. Defaults to true.',
        required: false,
      },
    ],
    handler: async ({ sourceServiceName, targetServiceName, connectionType, isEncrypted }) => {
      const currentState = stateRef.current;
      const sourceNode = currentState.nodes.find(
        n => n.data.displayName.toLowerCase() === sourceServiceName.toLowerCase()
      );
      const targetNode = currentState.nodes.find(
        n => n.data.displayName.toLowerCase() === targetServiceName.toLowerCase()
      );

      if (!sourceNode) {
        return `Could not find service named "${sourceServiceName}"`;
      }
      if (!targetNode) {
        return `Could not find service named "${targetServiceName}"`;
      }

      const validConnectionTypes = ['public', 'private-endpoint', 'vnet-integration', 'service-endpoint', 'peering'];
      const connType = validConnectionTypes.includes(connectionType || '')
        ? (connectionType as 'public' | 'private-endpoint' | 'vnet-integration' | 'service-endpoint' | 'peering')
        : 'public';

      const newEdge: AzureEdge = {
        id: `e-${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        data: {
          connectionType: connType,
          isEncrypted: isEncrypted ?? true,
        },
      };

      addEdgeRef.current(newEdge);
      return `Connected ${sourceServiceName} to ${targetServiceName} via ${connType} connection${isEncrypted !== false ? ' (encrypted)' : ''}`;
    },
  });

  // Action to create a resource group / container
  useCopilotAction({
    name: 'createResourceGroup',
    description: 'Create a container group (Resource Group, Virtual Network, or Subnet) on the canvas. Optionally wrap existing services inside it.',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Display name for the group (e.g., "Production-RG", "App-VNet")',
        required: true,
      },
      {
        name: 'groupType',
        type: 'string',
        description: `Type of container. Must be one of: ${VALID_GROUP_TYPES.join(', ')}`,
        required: true,
      },
      {
        name: 'subtitle',
        type: 'string',
        description: 'Optional subtitle (e.g., "10.0.0.0/16" for a VNet, "East US" for a Resource Group)',
        required: false,
      },
      {
        name: 'serviceNames',
        type: 'string',
        description: 'Comma-separated display names of existing services to add to this group',
        required: false,
      },
    ],
    handler: async ({ name, groupType, subtitle, serviceNames }) => {
      if (!VALID_GROUP_TYPES.includes(groupType as GroupType)) {
        return `Invalid group type: ${groupType}. Valid types are: ${VALID_GROUP_TYPES.join(', ')}`;
      }

      const currentState = stateRef.current;
      const groupId = generateId();

      // Find services to include
      const serviceNameList = serviceNames
        ? serviceNames.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const matchedNodes = serviceNameList
        .map((sn: string) => currentState.nodes.find(
          n => n.data.displayName.toLowerCase() === sn.toLowerCase()
        ))
        .filter((n): n is AzureNode => n !== undefined);

      // Calculate position based on matched nodes or default
      let position = { x: 100, y: 100 };
      let width = 400;
      let height = 200;

      if (matchedNodes.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        matchedNodes.forEach(n => {
          minX = Math.min(minX, n.position.x);
          minY = Math.min(minY, n.position.y);
          maxX = Math.max(maxX, n.position.x + 80);
          maxY = Math.max(maxY, n.position.y + 55);
        });
        const padding = 40;
        const headerHeight = 36;
        position = { x: minX - padding, y: minY - padding - headerHeight };
        width = Math.max(400, maxX - minX + padding * 2);
        height = Math.max(200, maxY - minY + padding * 2 + headerHeight);
      }

      addGroupRef.current({
        id: groupId,
        position,
        displayName: name,
        groupType: groupType as GroupType,
        subtitle,
        width,
        height,
      });

      // Assign matched services to the group
      matchedNodes.forEach(n => {
        assignNodeToGroupRef.current(n.id, groupId);
      });

      const wrappedMsg = matchedNodes.length > 0
        ? ` containing ${matchedNodes.map(n => n.data.displayName).join(', ')}`
        : '';
      return `Created ${groupType} "${name}"${wrappedMsg}`;
    },
  });

  // Action to add a service to an existing group
  useCopilotAction({
    name: 'addServiceToGroup',
    description: 'Add an existing service to a container group by name',
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        description: 'The display name of the service to add to the group',
        required: true,
      },
      {
        name: 'groupName',
        type: 'string',
        description: 'The display name of the target group',
        required: true,
      },
    ],
    handler: async ({ serviceName, groupName }) => {
      const currentState = stateRef.current;
      const service = currentState.nodes.find(
        n => n.data.displayName.toLowerCase() === serviceName.toLowerCase() && n.type !== 'group'
      );
      const group = currentState.nodes.find(
        n => n.data.displayName.toLowerCase() === groupName.toLowerCase() && n.type === 'group'
      );

      if (!service) return `Could not find service named "${serviceName}"`;
      if (!group) return `Could not find group named "${groupName}"`;

      assignNodeToGroupRef.current(service.id, group.id);
      return `Added ${serviceName} to group "${groupName}"`;
    },
  });

  // Action to generate a complete architecture in one call
  useCopilotAction({
    name: 'generateArchitecture',
    description: 'Generate a complete Azure architecture from a description. Creates all services, connections, and optionally groups in one call. Use this for building complete architectures quickly.',
    parameters: [
      {
        name: 'services',
        type: 'object[]',
        description: 'Array of services to create',
        required: true,
        attributes: [
          { name: 'serviceType', type: 'string', description: `One of: ${VALID_SERVICE_TYPES.join(', ')}`, required: true },
          { name: 'displayName', type: 'string', description: 'Display name', required: true },
        ],
      },
      {
        name: 'connections',
        type: 'object[]',
        description: 'Array of connections between services (by display name)',
        required: false,
        attributes: [
          { name: 'source', type: 'string', description: 'Source service display name', required: true },
          { name: 'target', type: 'string', description: 'Target service display name', required: true },
          { name: 'connectionType', type: 'string', description: 'Connection type (public, private-endpoint, vnet-integration, service-endpoint, peering)', required: false },
        ],
      },
      {
        name: 'groups',
        type: 'object[]',
        description: 'Array of groups to create, with member service names',
        required: false,
        attributes: [
          { name: 'name', type: 'string', description: 'Group display name', required: true },
          { name: 'groupType', type: 'string', description: 'resource-group, virtual-network, or subnet', required: true },
          { name: 'subtitle', type: 'string', description: 'Optional subtitle', required: false },
          { name: 'serviceNames', type: 'string', description: 'Comma-separated member service display names', required: false },
        ],
      },
    ],
    handler: async ({ services, connections, groups }) => {
      const currentState = stateRef.current;

      // Track created nodes by display name for connecting
      const createdNodes = new Map<string, string>(); // displayName -> id

      // Create all services first
      const serviceList = services as Array<{ serviceType: string; displayName: string }>;
      serviceList.forEach((svc) => {
        const validType = svc.serviceType as AzureServiceType;
        if (!VALID_SERVICE_TYPES.includes(validType)) return;

        const category = SERVICE_CATEGORIES[validType];
        const allNodes = [...currentState.nodes, ...Array.from(createdNodes.entries()).map(([name, id]) => ({
          id,
          type: 'azureService',
          position: { x: 0, y: 0 },
          data: { serviceType: validType, displayName: name, category, status: 'proposed' as const, properties: {} },
        }))];
        const position = calculateTierBasedPosition(category, allNodes);

        const nodeId = generateId();
        const newNode: AzureNode = {
          id: nodeId,
          type: 'azureService',
          position,
          data: {
            serviceType: validType,
            displayName: svc.displayName,
            category,
            status: 'proposed',
            properties: {},
          },
        };

        addNodeRef.current(newNode);
        createdNodes.set(svc.displayName.toLowerCase(), nodeId);
      });

      // Create connections
      const connList = (connections ?? []) as Array<{ source: string; target: string; connectionType?: string }>;
      connList.forEach((conn) => {
        const sourceId = createdNodes.get(conn.source.toLowerCase());
        const targetId = createdNodes.get(conn.target.toLowerCase());
        if (!sourceId || !targetId) return;

        const validConnTypes = ['public', 'private-endpoint', 'vnet-integration', 'service-endpoint', 'peering'];
        const connType = validConnTypes.includes(conn.connectionType ?? '')
          ? conn.connectionType as 'public'
          : 'public';

        addEdgeRef.current({
          id: `e-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          data: { connectionType: connType, isEncrypted: true },
        });
      });

      // Create groups and assign members
      const groupList = (groups ?? []) as Array<{ name: string; groupType: string; subtitle?: string; serviceNames?: string }>;
      groupList.forEach((g) => {
        if (!VALID_GROUP_TYPES.includes(g.groupType as GroupType)) return;

        const groupId = generateId();
        addGroupRef.current({
          id: groupId,
          position: { x: 50, y: 50 },
          displayName: g.name,
          groupType: g.groupType as GroupType,
          subtitle: g.subtitle,
        });

        if (g.serviceNames) {
          const names = g.serviceNames.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          names.forEach(name => {
            const nodeId = createdNodes.get(name);
            if (nodeId) {
              assignNodeToGroupRef.current(nodeId, groupId);
            }
          });
        }
      });

      // Auto-layout after batch creation
      setTimeout(() => {
        const latestState = stateRef.current;
        if (latestState.nodes.length > 0) {
          const positions = calculateAutoLayout(latestState.nodes, latestState.edges, 'LR');
          const updates: Array<{ id: string; position: { x: number; y: number } }> = [];
          positions.forEach((position, id) => { updates.push({ id, position }); });
          if (updates.length > 0) {
            updateNodesPositionsRef.current(updates);
          }
        }
      }, 100);

      return `Generated architecture: ${serviceList.length} services, ${connList.length} connections, ${groupList.length} groups`;
    },
  });

  // Action to organize/reorganize the diagram layout
  useCopilotAction({
    name: 'organizeLayout',
    description: 'Reorganize the diagram layout using tier-based auto-layout. Groups services by category: Security/Identity -> Networking -> Compute/Integration -> Data/Storage -> AI/Analytics -> Management. Also resizes group containers to fit their children.',
    parameters: [
      {
        name: 'direction',
        type: 'string',
        description: 'Layout direction: LR (left-to-right, default) or TB (top-to-bottom)',
        required: false,
      },
    ],
    handler: async ({ direction }) => {
      const currentState = stateRef.current;

      if (currentState.nodes.length === 0) {
        return 'No services to organize. Add some services first.';
      }

      const layoutDirection = direction === 'TB' ? 'TB' : 'LR';
      const positions = calculateAutoLayout(currentState.nodes, currentState.edges, layoutDirection);

      const updates: Array<{ id: string; position: { x: number; y: number } }> = [];
      positions.forEach((position, id) => {
        updates.push({ id, position });
      });

      if (updates.length > 0) {
        updateNodesPositionsRef.current(updates);
      }

      return `Reorganized ${currentState.nodes.length} services using ${layoutDirection === 'LR' ? 'horizontal' : 'vertical'} tier-based layout`;
    },
  });

  // Action to remove a service
  useCopilotAction({
    name: 'removeService',
    description: 'Remove an Azure service from the diagram',
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        description: 'The display name of the service to remove',
        required: true,
      },
    ],
    handler: async ({ serviceName }) => {
      const currentState = stateRef.current;
      const node = currentState.nodes.find(
        n => n.data.displayName.toLowerCase() === serviceName.toLowerCase()
      );

      if (!node) {
        return `Could not find service named "${serviceName}"`;
      }

      if (node.type === 'group') {
        removeGroupRef.current(node.id);
        return `Removed group "${serviceName}" (children preserved)`;
      }

      removeNodeRef.current(node.id);
      return `Removed ${serviceName} from the canvas`;
    },
  });

  // Action to clear the entire diagram
  useCopilotAction({
    name: 'clearDiagram',
    description: 'Clear all services and connections from the diagram',
    parameters: [],
    handler: async () => {
      clearDiagramRef.current();
      return 'Cleared all services and connections from the diagram';
    },
  });

  // Action to get available service types
  useCopilotAction({
    name: 'getAvailableServices',
    description: 'Get a list of all available Azure service types that can be added, organized by category',
    parameters: [],
    handler: async () => {
      const byCategory = new Map<AzureServiceCategory, AzureServiceType[]>();

      VALID_SERVICE_TYPES.forEach(type => {
        const category = SERVICE_CATEGORIES[type];
        if (!byCategory.has(category)) {
          byCategory.set(category, []);
        }
        byCategory.get(category)!.push(type);
      });

      let result = 'Available Azure services by category:\n';
      byCategory.forEach((types, category) => {
        result += `\n${category.toUpperCase()}: ${types.join(', ')}`;
      });
      result += `\n\nAvailable container types: ${VALID_GROUP_TYPES.join(', ')}`;

      return result;
    },
  });
}
