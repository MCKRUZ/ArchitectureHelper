'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { FlatAzureNode } from './nodes/FlatAzureNode';
import { FlatGroupNode } from './nodes/FlatGroupNode';
import { AzureEdge } from './edges/AzureEdge';
import { IsometricGrid } from './IsometricGrid';
import { CartesianGrid } from './CartesianGrid';
import { useDiagramState } from '@/lib/state/useDiagramState';
import { useCopilotActions } from './useCopilotActions';
import { snapToIsoGrid, snapGroupToIsoGrid } from '@/lib/layout/isoSnap';
import { snapToCartesianGrid } from '@/lib/layout/cartesianSnap';
import type { AzureNodeData, AzureEdgeData, AzureServiceType, AzureServiceCategory, GroupType } from '@/lib/state/types';
import { generateId } from '@/lib/utils';

type AzureFlowNode = Node<AzureNodeData>;
type AzureFlowEdge = Edge<AzureEdgeData>;

// Isometric node types
const isoNodeTypes = {
  azureService: GenericAzureNode,
  group: GroupNode,
};

// 2D flat node types
const flatNodeTypes = {
  azureService: FlatAzureNode,
  group: FlatGroupNode,
};

// Edge types (shared)
const edgeTypes = {
  azure: AzureEdge,
};

function AzureCanvasInner() {
  const {
    state,
    selectNode,
    updateNodesPositions,
    updateNode,
    addEdge: addEdgeToState,
    addNode,
    removeNode,
    clearDiagram,
    addGroup,
    assignNodeToGroup,
    removeGroup,
    batchUpdate,
    setValidationResults,
    setCostSummary,
  } = useDiagramState();

  const isIso = state.viewMode === 'isometric';
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useCopilotActions({
    state,
    addNode,
    removeNode,
    addEdge: addEdgeToState,
    clearDiagram,
    updateNodesPositions,
    updateNode,
    addGroup,
    assignNodeToGroup,
    removeGroup,
    batchUpdate,
    setValidationResults,
    setCostSummary,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<AzureFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AzureFlowEdge>([]);

  // Switch nodeTypes based on viewMode — intentionally remounts nodes
  const nodeTypes = useMemo(() => (isIso ? isoNodeTypes : flatNodeTypes), [isIso]);

  // Sync state.nodes to React Flow nodes
  useEffect(() => {
    const parentGroups: AzureFlowNode[] = [];
    const childGroups: AzureFlowNode[] = [];
    const serviceChildren: AzureFlowNode[] = [];

    state.nodes.forEach((n) => {
      if (n.type === 'group') {
        const w = (n.data.properties?.width as number) ?? 400;
        const h = (n.data.properties?.height as number) ?? 200;

        const groupNode: AzureFlowNode = isIso
          ? {
              id: n.id,
              type: 'group',
              position: n.position,
              data: n.data as AzureNodeData,
              style: { width: w, height: h },
              dragHandle: '.group-label',
              parentId: n.parentId,
            }
          : {
              id: n.id,
              type: 'group' as const,
              position: n.position,
              data: n.data as AzureNodeData,
              style: { width: w, height: h },
              parentId: n.parentId,
            };

        // Parent groups (no parentId) come first, nested groups come after
        if (n.parentId) {
          childGroups.push(groupNode);
        } else {
          parentGroups.push(groupNode);
        }
      } else {
        serviceChildren.push({
          id: n.id,
          type: 'azureService' as const,
          position: n.position,
          data: n.data as AzureNodeData,
          parentId: n.parentId,
        });
      }
    });

    // React Flow requires parents before children in the array
    setNodes([...parentGroups, ...childGroups, ...serviceChildren]);
  }, [state.nodes, setNodes, isIso]);

  // Sync state.edges to React Flow edges
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

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

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

  // View-mode-aware snap function
  const snapPosition = useCallback(
    (x: number, y: number, nodeType?: string, nodeW?: number) => {
      if (isIso) {
        if (nodeType === 'group' && nodeW) {
          return snapGroupToIsoGrid(x, y, nodeW);
        }
        return snapToIsoGrid(x, y);
      }
      return snapToCartesianGrid(x, y);
    },
    [isIso]
  );

  // Handle node changes (position updates + group resize snap)
  const handleNodesChange = useCallback(
    (changes: NodeChange<AzureFlowNode>[]) => {
      onNodesChange(changes);

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

          let snappedW: number;
          let snappedH: number;

          if (isIso) {
            snappedW = Math.max(160, Math.round(change.dimensions.width / 80) * 80);
            snappedH = snappedW / 2;
          } else {
            snappedW = Math.max(200, Math.round(change.dimensions.width / 40) * 40);
            snappedH = Math.max(120, Math.round(change.dimensions.height / 40) * 40);
          }

          setNodes((nds) =>
            nds.map((n) => {
              if (n.id !== change.id) return n;
              return {
                ...n,
                style: { ...n.style, width: snappedW, height: snappedH },
              };
            })
          );

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
    [onNodesChange, updateNodesPositions, state.nodes, setNodes, updateNode, isIso]
  );

  // Live snap during drag
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: AzureFlowNode) => {
      const w = (node.measured?.width ?? (node.style?.width as number)) || 400;
      const snapped = snapPosition(node.position.x, node.position.y, node.type, w);

      if (snapped.x !== node.position.x || snapped.y !== node.position.y) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id ? { ...n, position: snapped } : n
          )
        );
        updateNodesPositions([{ id: node.id, position: snapped }]);
      }
    },
    [setNodes, updateNodesPositions, snapPosition]
  );

  // Final snap on drag stop
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: AzureFlowNode) => {
      const w = (node.measured?.width ?? (node.style?.width as number)) || 400;
      const snapped = snapPosition(node.position.x, node.position.y, node.type, w);

      if (snapped.x !== node.position.x || snapped.y !== node.position.y) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id ? { ...n, position: snapped } : n
          )
        );
        updateNodesPositions([{ id: node.id, position: snapped }]);
      }
    },
    [setNodes, updateNodesPositions, snapPosition]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

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
          const snapped = isIso
            ? snapGroupToIsoGrid(rawPosition.x - defaultW / 2, rawPosition.y - 100, defaultW)
            : snapToCartesianGrid(rawPosition.x - defaultW / 2, rawPosition.y - 60);

          addGroup({
            id: generateId(),
            position: snapped,
            displayName: group.name,
            groupType: group.groupType,
            width: isIso ? 400 : 400,
            height: isIso ? 200 : 200,
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

        const rawPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const position = isIso
          ? snapToIsoGrid(rawPosition.x, rawPosition.y)
          : snapToCartesianGrid(rawPosition.x, rawPosition.y);

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

        addNode(newNode);
      } catch (e) {
        console.error('Failed to parse dropped service:', e);
      }
    },
    [screenToFlowPosition, addNode, addGroup, isIso]
  );

  const GridComponent = isIso ? IsometricGrid : CartesianGrid;

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
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={{
        type: 'azure',
        animated: false,
      }}
      proOptions={{ hideAttribution: true }}
      className="cloudcraft-canvas"
    >
      <GridComponent />
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

export function AzureCanvas() {
  return (
    <ReactFlowProvider>
      <AzureCanvasInner />
    </ReactFlowProvider>
  );
}
