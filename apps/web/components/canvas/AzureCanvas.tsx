'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GenericAzureNode } from './nodes/GenericAzureNode';
import { GroupNode } from './nodes/GroupNode';
import { AzureEdge } from './edges/AzureEdge';
import { IsometricGrid } from './IsometricGrid';
import { useDiagramState } from '@/lib/state/useDiagramState';
import { useCopilotActions } from './useCopilotActions';
import type { AzureNodeData, AzureEdgeData, AzureServiceType, AzureServiceCategory, GroupType } from '@/lib/state/types';
import { generateId } from '@/lib/utils';

// Define typed node and edge for React Flow
type AzureFlowNode = Node<AzureNodeData>;
type AzureFlowEdge = Edge<AzureEdgeData>;

// Register custom node types
const nodeTypes = {
  azureService: GenericAzureNode,
  group: GroupNode,
};

// Register custom edge types
const edgeTypes = {
  azure: AzureEdge,
};

// --- Isometric grid snapping ---
// Grid vertices in the 2:1 isometric grid are at ((n-m)*G, (n+m)*G/2)
// for integer n, m where G = GRID_SPACING = 40.
// The 3D cube's bottom vertex is at (nodeX + 40, nodeY + 55).
// We snap the BOTTOM to the grid so the cube sits ON the grid.
const ISO_G = 40;
const DIAMOND_HALF_W = 40;
const CUBE_BOTTOM_Y = 55; // DH(40) + D(15) — bottom vertex offset from node top

function snapToIsoGrid(nodeX: number, nodeY: number): { x: number; y: number } {
  const botX = nodeX + DIAMOND_HALF_W;
  const botY = nodeY + CUBE_BOTTOM_Y;
  const halfG = ISO_G / 2;

  const kFloor = Math.floor(botX / ISO_G);
  const kCeil = kFloor + 1;
  const jFloor = Math.floor(botY / halfG);
  const jCeil = jFloor + 1;

  let bestDist = Infinity;
  let bestX = nodeX;
  let bestY = nodeY;

  for (const k of [kFloor, kCeil]) {
    for (const j of [jFloor, jCeil]) {
      if ((k + j) % 2 !== 0) continue; // only valid grid vertices
      const gx = k * ISO_G;
      const gy = j * halfG;
      const d = (gx - botX) ** 2 + (gy - botY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestX = gx - DIAMOND_HALF_W;
        bestY = gy - CUBE_BOTTOM_Y;
      }
    }
  }

  return { x: bestX, y: bestY };
}

// Snap a group node's TOP vertex to the nearest isometric grid vertex.
// The diamond's top vertex is at (nodeX + W/2, nodeY).
function snapGroupToIsoGrid(nodeX: number, nodeY: number, nodeW: number): { x: number; y: number } {
  const topX = nodeX + nodeW / 2;
  const topY = nodeY;
  const halfG = ISO_G / 2;

  const kFloor = Math.floor(topX / ISO_G);
  const kCeil = kFloor + 1;
  const jFloor = Math.floor(topY / halfG);
  const jCeil = jFloor + 1;

  let bestDist = Infinity;
  let bestX = nodeX;
  let bestY = nodeY;

  for (const k of [kFloor, kCeil]) {
    for (const j of [jFloor, jCeil]) {
      if ((k + j) % 2 !== 0) continue;
      const gx = k * ISO_G;
      const gy = j * halfG;
      const d = (gx - topX) ** 2 + (gy - topY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestX = gx - nodeW / 2;
        bestY = gy;
      }
    }
  }

  return { x: bestX, y: bestY };
}

// Inner component that uses useReactFlow
function AzureCanvasInner() {
  const { state, selectNode, updateNodesPositions, updateNode, addEdge: addEdgeToState, addNode, removeNode, clearDiagram, addGroup, assignNodeToGroup, removeGroup } = useDiagramState();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Register CopilotKit actions for AI-driven diagram manipulation
  useCopilotActions({
    state,
    addNode,
    removeNode,
    addEdge: addEdgeToState,
    clearDiagram,
    updateNodesPositions,
    addGroup,
    assignNodeToGroup,
    removeGroup,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<AzureFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AzureFlowEdge>([]);

  // Sync state.nodes to React Flow nodes whenever state changes
  // Parent (group) nodes must come before children in the array for React Flow
  useEffect(() => {
    const groups: AzureFlowNode[] = [];
    const children: AzureFlowNode[] = [];

    state.nodes.forEach((n) => {
      if (n.type === 'group') {
        const w = (n.data.properties?.width as number) ?? 400;
        const h = (n.data.properties?.height as number) ?? 200;
        groups.push({
          id: n.id,
          type: 'group',
          position: n.position,
          data: n.data as AzureNodeData,
          style: { width: w, height: h },
          dragHandle: '.group-drag-handle',
        });
      } else {
        children.push({
          id: n.id,
          type: 'azureService' as const,
          position: n.position,
          data: n.data as AzureNodeData,
          parentId: n.parentId,
          extent: n.parentId ? 'parent' as const : undefined,
        });
      }
    });

    setNodes([...groups, ...children]);
  }, [state.nodes, setNodes]);

  // Sync state.edges to React Flow edges whenever state changes
  // Single centered handle per node — edge component computes actual endpoints
  useEffect(() => {
    const flowEdges: AzureFlowEdge[] = state.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: 'center',
      targetHandle: 'center',
      type: 'azure',
      data: e.data,
    }));
    setEdges(flowEdges);
  }, [state.edges, setEdges]);

  // Handle node selection
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge = {
          id: `e-${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          data: {
            connectionType: 'public' as const,
            isEncrypted: true,
          },
        };
        addEdgeToState(newEdge);
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [addEdgeToState, setEdges]
  );

  // Handle node changes (position updates + group resize snap)
  const handleNodesChange = useCallback(
    (changes: NodeChange<AzureFlowNode>[]) => {
      onNodesChange(changes);

      // Sync position changes back to state
      const positionChanges = changes
        .filter((c): c is NodeChange<AzureFlowNode> & { type: 'position'; position: { x: number; y: number } } =>
          c.type === 'position' && 'position' in c && c.position !== undefined)
        .map((c) => ({
          id: c.id,
          position: c.position,
        }));

      if (positionChanges.length > 0) {
        updateNodesPositions(positionChanges);
      }

      // Snap group dimensions on resize end
      // W must be a multiple of 80, H = W/2 to keep all diamond vertices on grid
      for (const change of changes) {
        if (
          change.type === 'dimensions' &&
          'resizing' in change &&
          change.resizing === false &&
          'dimensions' in change &&
          change.dimensions != null
        ) {
          const stateNode = state.nodes.find((n) => n.id === change.id);
          if (stateNode?.type !== 'group') continue;

          const rawW = change.dimensions.width;
          const snappedW = Math.max(160, Math.round(rawW / 80) * 80);
          const snappedH = snappedW / 2;

          // Snap React Flow node style + re-snap position
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id !== change.id) return n;
              const snappedPos = snapGroupToIsoGrid(n.position.x, n.position.y, snappedW);
              return {
                ...n,
                style: { ...n.style, width: snappedW, height: snappedH },
                position: snappedPos,
              };
            })
          );

          // Sync snapped dimensions + position back to diagram state
          updateNode(change.id, {
            data: {
              ...stateNode.data,
              properties: {
                ...stateNode.data.properties,
                width: snappedW,
                height: snappedH,
              },
            },
          });
        }
      }
    },
    [onNodesChange, updateNodesPositions, state.nodes, setNodes, updateNode]
  );

  // Snap node to isometric grid vertex on drag stop
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: AzureFlowNode) => {
      let snapped: { x: number; y: number };

      if (node.type === 'group') {
        const w = (node.measured?.width ?? (node.style?.width as number)) || 400;
        snapped = snapGroupToIsoGrid(node.position.x, node.position.y, w);
      } else {
        snapped = snapToIsoGrid(node.position.x, node.position.y);
      }

      if (snapped.x !== node.position.x || snapped.y !== node.position.y) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id ? { ...n, position: snapped } : n
          )
        );
        updateNodesPositions([{ id: node.id, position: snapped }]);
      }
    },
    [setNodes, updateNodesPositions]
  );

  // Handle drag over to allow drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle drop to create new node
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Check for group container drop
      const groupData = event.dataTransfer.getData('application/azurecraft-group');
      if (groupData) {
        try {
          const group = JSON.parse(groupData) as {
            groupType: GroupType;
            name: string;
          };

          const rawPosition = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          const defaultW = 400;
          const snappedPos = snapGroupToIsoGrid(
            rawPosition.x - defaultW / 2,
            rawPosition.y - 100,
            defaultW,
          );

          addGroup({
            id: generateId(),
            position: snappedPos,
            displayName: group.name,
            groupType: group.groupType,
          });
        } catch (e) {
          console.error('Failed to parse dropped group:', e);
        }
        return;
      }

      const serviceData = event.dataTransfer.getData('application/azurecraft-service');
      if (!serviceData) return;

      try {
        const service = JSON.parse(serviceData) as {
          type: AzureServiceType;
          name: string;
          category: AzureServiceCategory;
          description: string;
        };

        // Get drop position in flow coordinates, snapped to isometric grid
        const rawPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const position = snapToIsoGrid(rawPosition.x, rawPosition.y);

        // Create new node
        const newNode = {
          id: generateId(),
          type: 'azureService',
          position,
          data: {
            serviceType: service.type,
            displayName: service.name,
            category: service.category,
            status: 'proposed' as const,
            properties: {},
          },
        };

        // Add to state (React Flow will sync via useEffect)
        addNode(newNode);
      } catch (e) {
        console.error('Failed to parse dropped service:', e);
      }
    },
    [screenToFlowPosition, addNode, addGroup]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      connectionMode={ConnectionMode.Loose}
      snapToGrid
      snapGrid={[40, 20]}
      defaultEdgeOptions={{
        type: 'azure',
        animated: false,
      }}
      proOptions={{ hideAttribution: true }}
      className="cloudcraft-canvas"
    >
      <IsometricGrid />
      <Controls className="cloudcraft-controls" />
      <MiniMap
        nodeStrokeWidth={2}
        zoomable
        pannable
        className="cloudcraft-minimap"
        maskColor="rgba(241, 245, 249, 0.7)"
      />
    </ReactFlow>
    </div>
  );
}

// Wrapper component that provides ReactFlowProvider
export function AzureCanvas() {
  return (
    <ReactFlowProvider>
      <AzureCanvasInner />
    </ReactFlowProvider>
  );
}
