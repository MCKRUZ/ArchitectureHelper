/**
 * Konva Canvas - Full Feature Parity with React Flow
 *
 * Features:
 * - Tier-based layout with auto-layout
 * - Container groups (Resource Group, VNet, Subnet) with child movement
 * - Pan/zoom with mouse wheel
 * - Drag-and-drop from palette
 * - Node selection (click) and properties editing
 * - Edge connections with orthogonal routing
 * - Grid background
 * - Minimap
 * - Controls (zoom in/out, fit view)
 * - View modes (2D, Isometric, Cost Heatmap, Compliance)
 * - Cost display on nodes
 * - Status indicators
 * - Export/Import
 * - State synchronization with DiagramProvider
 */

'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Group, Text, Circle, Line, Arrow, Image as KonvaImage, Shape } from 'react-konva';
import { useDiagramState } from '@/lib/state/useDiagramState';
import { useCopilotActions } from './useCopilotActions';
import { generateId } from '@/lib/utils';
import type { AzureServiceCategory, AzureServiceType, AzureNode, GroupType } from '@/lib/state/types';
import { useKonvaIcons } from '@/lib/icons/useKonvaIcons';

// Tier positions for layout - wider spacing to prevent overlap
const TIER_X: Record<string, number> = {
  'security': 100,
  'identity': 100,
  'networking': 500,
  'compute': 950,
  'web': 950,
  'containers': 950,
  'integration': 1400,
  'messaging': 1400,
  'databases': 1850,
  'storage': 1850,
  'ai-ml': 2300,
  'analytics': 2300,
  'management': 100,
  'devops': 100,
};

// Category colors
const CATEGORY_COLORS: Record<AzureServiceCategory, string> = {
  'compute': '#0078D4',
  'networking': '#10B981',
  'storage': '#F59E0B',
  'databases': '#8B5CF6',
  'ai-ml': '#EC4899',
  'analytics': '#6366F1',
  'integration': '#14B8A6',
  'messaging': '#3B82F6',
  'identity': '#F97316',
  'security': '#EF4444',
  'management': '#64748B',
  'devops': '#06B6D4',
  'web': '#0EA5E9',
  'containers': '#059669',
};

const NODE_W = 280;
const NODE_H = 72;
const NODE_SPACING = 150; // More spacing to prevent overlap
const ICON_SIZE = 48;
const GRID_SIZE = 40;
const GROUP_PADDING = 60; // Extra padding for groups

// Isometric cube dimensions — small flat diamond style matching old GenericAzureNode (DW=80, DH=40, D=15)
// Must match NODE_W_ISO=80, NODE_H_ISO=80 in tierLayoutSimple.ts
const ISO_DW     = 80;  // diamond width
const ISO_DH     = 40;  // diamond height (= DW/2 for 2:1 iso ratio)
const ISO_D      = 15;  // cube depth (side face height)
const ISO_ICON   = 20;  // icon rendered flat on top face
const ISO_HALF_DW = ISO_DW / 2;  // 40 — horizontal midpoint
const ISO_HALF_DH = ISO_DH / 2;  // 20 — vertical midpoint of top face

// Cloudcraft-style face colors — light source from upper-right
const ISO_TOP_COLOR   = '#f0f0f2'; // near white — lightest face
const ISO_RIGHT_COLOR = '#c4c4c8'; // medium gray — oblique light
const ISO_LEFT_COLOR  = '#9a9a9f'; // shadow gray — darkest face
const ISO_STROKE_COLOR = '#aaaaaf';// hairline between faces

// Pre-computed face polygons (local coords, origin = bounding box top-left)
const ISO_TOP_FACE   = [ISO_HALF_DW, 0,  ISO_DW, ISO_HALF_DH,  ISO_HALF_DW, ISO_DH,  0, ISO_HALF_DH];
const ISO_RIGHT_FACE = [ISO_DW, ISO_HALF_DH,  ISO_DW, ISO_HALF_DH + ISO_D,  ISO_HALF_DW, ISO_DH + ISO_D,  ISO_HALF_DW, ISO_DH];
const ISO_LEFT_FACE  = [ISO_HALF_DW, ISO_DH,  ISO_HALF_DW, ISO_DH + ISO_D,  0, ISO_HALF_DH + ISO_D,  0, ISO_HALF_DH];

/** Blend a hex color towards black by `amount` (0–1). */
function darkenHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const d = 1 - amount;
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * d));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * d));
  const b = Math.max(0, Math.round((n & 0xff) * d));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Measure actual rendered text width using an off-screen canvas. */
function measureTextWidth(text: string, fontSize: number, fontStyle: string): number {
  if (typeof document === 'undefined') return text.length * 7; // SSR fallback
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * 7;
  ctx.font = `${fontStyle} ${fontSize}px sans-serif`;
  return ctx.measureText(text).width;
}

export function KonvaCanvas() {
  const {
    state,
    selectNode,
    selectEdge,
    updateNode,
    addNode,
    addGroup,
    removeNode,
    removeGroup,
    removeEdge,
    addEdge,
    updateEdge,
    clearDiagram,
    assignNodeToGroup,
    batchUpdate,
    setValidationResults,
    setCostSummary,
    updateNodesPositions,
  } = useDiagramState();

  // Initialize CopilotKit AI actions
  useCopilotActions({
    state,
    addNode,
    removeNode,
    addEdge,
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

  // Load Azure service icons for Konva
  const uniqueServiceTypes = useMemo(() => {
    const types = new Set<AzureServiceType>();
    state.nodes
      .filter(n => n.type !== 'group')
      .forEach(n => types.add(n.data.serviceType));
    return Array.from(types);
  }, [state.nodes]);

  const iconImages = useKonvaIcons(uniqueServiceTypes, ICON_SIZE);

  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions state (client-side only)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Pan/zoom state
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Track node positions for group dragging
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Selected node ID for highlighting
  const selectedId = state.selectedNodeId;

  // Port-drag connection state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dragConnection, setDragConnection] = useState<{
    sourceId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [connectionTargetId, setConnectionTargetId] = useState<string | null>(null);

  // Multi-select state
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  // Clipboard state for copy/paste
  const [clipboard, setClipboard] = useState<AzureNode[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
  }>({ visible: false, x: 0, y: 0 });

  // Set dimensions on client-side mount
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Ctrl key
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
      }

      // Delete key - remove selected node(s) or edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          // Delete all selected nodes
          selectedNodeIds.forEach(nodeId => removeNode(nodeId));
          setSelectedNodeIds(new Set());
          selectNode(null);
        } else if (selectedId) {
          e.preventDefault();
          removeNode(selectedId);
          selectNode(null);
        } else if (state.selectedEdgeId) {
          e.preventDefault();
          removeEdge(state.selectedEdgeId);
          selectEdge(null);
        }
      }

      // Copy - Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          const nodesToCopy = state.nodes.filter(n => selectedNodeIds.has(n.id));
          setClipboard(nodesToCopy);
        } else if (selectedId) {
          e.preventDefault();
          const nodeToCopy = state.nodes.find(n => n.id === selectedId);
          if (nodeToCopy) {
            setClipboard([nodeToCopy]);
          }
        }
      }

      // Paste - Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard.length > 0) {
          e.preventDefault();
          const PASTE_OFFSET = 40;

          // Create new nodes with offset positions
          clipboard.forEach(node => {
            const newNode: AzureNode = {
              ...node,
              id: generateId(),
              position: {
                x: node.position.x + PASTE_OFFSET,
                y: node.position.y + PASTE_OFFSET,
              },
              data: {
                ...node.data,
                displayName: `${node.data.displayName} (Copy)`,
              },
            };

            if (node.type === 'group') {
              // Extract group properties for addGroup
              addGroup({
                id: newNode.id,
                position: newNode.position,
                displayName: newNode.data.displayName,
                groupType: newNode.data.groupType as GroupType,
                subtitle: newNode.data.subtitle,
                width: newNode.data.properties?.width as number,
                height: newNode.data.properties?.height as number,
              });
            } else {
              addNode(newNode);
            }
          });
        }
      }

      // Tab - cycle through nodes
      if (e.key === 'Tab') {
        e.preventDefault();
        const allNodes = state.nodes.filter(n => n.type !== 'group');
        if (allNodes.length === 0) return;

        const currentIndex = selectedId ? allNodes.findIndex(n => n.id === selectedId) : -1;
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + allNodes.length) % allNodes.length
          : (currentIndex + 1) % allNodes.length;

        const nextNode = allNodes[nextIndex];
        selectNode(nextNode.id);
        setSelectedNodeIds(new Set());

        // Center on selected node
        const pos = nodePositions.get(nextNode.id) ?? servicePositions.get(nextNode.id) ?? nextNode.position;
        setStagePos({
          x: dimensions.width / 2 - (pos.x + NODE_W / 2) * scale,
          y: dimensions.height / 2 - (pos.y + NODE_H / 2) * scale,
        });
      }

      // Escape - deselect / cancel connection drag
      if (e.key === 'Escape') {
        selectNode(null);
        selectEdge(null);
        setSelectedNodeIds(new Set());
        setDragConnection(null);
        setConnectionTargetId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release Ctrl key
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, selectedNodeIds, state.selectedEdgeId, state.edges, state.nodes, clipboard, removeNode, removeEdge, selectNode, selectEdge, addNode, addGroup]);

  // Separate groups and services
  const groups = useMemo(() => state.nodes.filter(n => n.type === 'group'), [state.nodes]);
  const services = useMemo(() => state.nodes.filter(n => n.type !== 'group'), [state.nodes]);

  // Calculate tier-based positions
  const servicePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const servicesByTier = new Map<number, typeof services>();

    services.forEach(service => {
      const tierX = TIER_X[service.data.category] ?? 500;
      if (!servicesByTier.has(tierX)) {
        servicesByTier.set(tierX, []);
      }
      servicesByTier.get(tierX)!.push(service);
    });

    servicesByTier.forEach((tierServices, tierX) => {
      tierServices.forEach((service, index) => {
        const y = 150 + index * (NODE_H + NODE_SPACING);
        positions.set(service.id, { x: tierX, y });
      });
    });

    return positions;
  }, [services]);

  // Removed complex groupLayouts useMemo - calculate inline to avoid infinite loops

  // Handle zoom
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    const clampedScale = Math.max(0.1, Math.min(3, newScale));

    setScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  // Handle node click for selection
  const handleNodeClick = useCallback((nodeId: string) => {
    if (isCtrlPressed) {
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
      selectNode(nodeId);
    } else {
      setSelectedNodeIds(new Set());
      selectNode(nodeId);
    }
  }, [isCtrlPressed, selectNode]);

  // --- Port drag connection handlers ---

  // Convert screen pointer position to stage (world) coordinates
  const screenToStage = useCallback((screenX: number, screenY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: screenX, y: screenY };
    const rect = stage.container().getBoundingClientRect();
    return {
      x: (screenX - rect.left - stagePos.x) / scale,
      y: (screenY - rect.top - stagePos.y) / scale,
    };
  }, [stagePos, scale]);

  const handlePortMouseDown = useCallback((nodeId: string, e: any) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pos = nodePositions.get(nodeId) ?? node.position;
    const isIso = state.viewMode === 'isometric';
    const startX = pos.x + (isIso ? ISO_DW     : NODE_W);
    const startY = pos.y + (isIso ? ISO_HALF_DH : NODE_H / 2);
    setDragConnection({ sourceId: nodeId, startX, startY, currentX: startX, currentY: startY });
    setConnectionTargetId(null);
  }, [state.nodes, nodePositions]);

  const handleStageMoveForConnection = useCallback((e: any) => {
    if (!dragConnection) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    setDragConnection(prev => prev ? {
      ...prev,
      currentX: (pos.x - stagePos.x) / scale,
      currentY: (pos.y - stagePos.y) / scale,
    } : null);
  }, [dragConnection, stagePos, scale]);

  const handleStageMouseUpForConnection = useCallback(() => {
    if (!dragConnection) return;
    if (connectionTargetId && connectionTargetId !== dragConnection.sourceId) {
      addEdge({
        id: generateId(),
        source: dragConnection.sourceId,
        target: connectionTargetId,
        data: { connectionType: 'private-endpoint', isEncrypted: true },
      });
    }
    setDragConnection(null);
    setConnectionTargetId(null);
  }, [dragConnection, connectionTargetId, addEdge]);

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
    setSelectedNodeIds(new Set());
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, [selectNode, selectEdge]);

  // Handle edge click
  const handleEdgeClick = useCallback((edgeId: string, e: any) => {
    e.cancelBubble = true;
    selectNode(null);
    selectEdge(edgeId);
  }, [selectNode, selectEdge]);

  // Context menu handlers
  const handleNodeContextMenu = useCallback((nodeId: string, e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    setContextMenu({
      visible: true,
      x: pointerPosition.x,
      y: pointerPosition.y,
      nodeId,
    });
  }, []);

  const handleEdgeContextMenu = useCallback((edgeId: string, e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    setContextMenu({
      visible: true,
      x: pointerPosition.x,
      y: pointerPosition.y,
      edgeId,
    });
  }, []);

  const handleContextMenuAction = useCallback((action: string) => {
    if (contextMenu.nodeId) {
      const node = state.nodes.find(n => n.id === contextMenu.nodeId);
      if (!node) return;

      switch (action) {
        case 'delete':
          removeNode(contextMenu.nodeId);
          break;
        case 'copy':
          setClipboard([node]);
          break;
        case 'duplicate':
          const newNode: AzureNode = {
            ...node,
            id: generateId(),
            position: {
              x: node.position.x + 40,
              y: node.position.y + 40,
            },
            data: {
              ...node.data,
              displayName: `${node.data.displayName} (Copy)`,
            },
          };
          if (node.type === 'group') {
            // Extract group properties for addGroup
            addGroup({
              id: newNode.id,
              position: newNode.position,
              displayName: newNode.data.displayName,
              groupType: newNode.data.groupType as GroupType,
              subtitle: newNode.data.subtitle,
              width: newNode.data.properties?.width as number,
              height: newNode.data.properties?.height as number,
            });
          } else {
            addNode(newNode);
          }
          break;
      }
    }

    if (contextMenu.edgeId) {
      switch (action) {
        case 'delete':
          removeEdge(contextMenu.edgeId);
          selectEdge(null);
          break;
      }
    }

    setContextMenu({ visible: false, x: 0, y: 0 });
  }, [contextMenu, state.nodes, removeNode, addNode, addGroup, selectEdge]);

  // Handle group drag - move children with the group
  const handleGroupDragMove = useCallback((groupId: string, newX: number, newY: number) => {
    const group = state.nodes.find(n => n.id === groupId);
    if (!group) return;

    const deltaX = newX - group.position.x;
    const deltaY = newY - group.position.y;

    const groupWidth = (group.data.properties?.width as number) ?? 400;
    const groupHeight = (group.data.properties?.height as number) ?? 250;

    // Find all services spatially within this group
    const childServices = services.filter(service => {
      const pos = nodePositions.get(service.id) ?? servicePositions.get(service.id) ?? { x: 0, y: 0 };
      return (
        pos.x >= group.position.x &&
        pos.x <= group.position.x + groupWidth &&
        pos.y >= group.position.y &&
        pos.y <= group.position.y + groupHeight
      );
    });

    // Update local positions
    setNodePositions(prev => {
      const updated = new Map(prev);
      childServices.forEach(service => {
        const currentPos = nodePositions.get(service.id) ?? servicePositions.get(service.id) ?? { x: 0, y: 0 };
        updated.set(service.id, {
          x: currentPos.x + deltaX,
          y: currentPos.y + deltaY,
        });
      });
      return updated;
    });
  }, [state.nodes, services, servicePositions, nodePositions]);

  // Handle group drag end - persist to state
  const handleGroupDragEnd = useCallback((groupId: string, newX: number, newY: number) => {
    const updates = [{ id: groupId, position: { x: newX, y: newY } }];

    // Also update child positions
    const group = state.nodes.find(n => n.id === groupId);
    if (group) {
      const groupWidth = (group.data.properties?.width as number) ?? 400;
      const groupHeight = (group.data.properties?.height as number) ?? 250;

      const childServices = services.filter(service => {
        const pos = nodePositions.get(service.id) ?? servicePositions.get(service.id) ?? { x: 0, y: 0 };
        return (
          pos.x >= group.position.x &&
          pos.x <= group.position.x + groupWidth &&
          pos.y >= group.position.y &&
          pos.y <= group.position.y + groupHeight
        );
      });

      childServices.forEach(service => {
        const pos = nodePositions.get(service.id);
        if (pos) {
          updates.push({ id: service.id, position: pos });
        }
      });
    }

    updateNodesPositions(updates);
  }, [state.nodes, services, nodePositions, servicePositions, updateNodesPositions]);

  // Handle service node drag end - persist to state
  const handleServiceDragEnd = useCallback((serviceId: string, newX: number, newY: number) => {
    setNodePositions(prev => {
      const updated = new Map(prev);
      updated.set(serviceId, { x: newX, y: newY });
      return updated;
    });
    updateNodesPositions([{ id: serviceId, position: { x: newX, y: newY } }]);
  }, [updateNodesPositions]);

  // Handle drop from palette
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    // Get drop position in canvas coordinates
    const rect = stage.container().getBoundingClientRect();
    const x = (e.clientX - rect.left - stagePos.x) / scale;
    const y = (e.clientY - rect.top - stagePos.y) / scale;

    // Check for group drop
    const groupData = e.dataTransfer.getData('application/azurecraft-group');
    if (groupData) {
      try {
        const group = JSON.parse(groupData) as { groupType: GroupType; name: string };
        addGroup({
          id: generateId(),
          position: { x, y },
          displayName: group.name,
          groupType: group.groupType,
          width: 400,
          height: 250,
        });
        return;
      } catch (err) {
        console.error('Failed to parse group data:', err);
        return;
      }
    }

    // Check for service drop
    const serviceData = e.dataTransfer.getData('application/azurecraft-service');
    if (serviceData) {
      try {
        const service = JSON.parse(serviceData) as {
          type: AzureServiceType;
          name: string;
          category: AzureServiceCategory;
          description: string;
        };

        addNode({
          id: generateId(),
          type: 'azureService',
          position: { x, y },
          data: {
            serviceType: service.type,
            displayName: service.name,
            category: service.category,
            status: 'proposed',
            properties: {},
          },
        });
      } catch (err) {
        console.error('Failed to parse service data:', err);
      }
    }
  }, [addGroup, addNode, stagePos, scale]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Auto-layout - rearrange nodes by tier
  const handleAutoLayout = useCallback(() => {
    const updates: Array<{ id: string; position: { x: number; y: number } }> = [];

    // Clear any manual positioning
    setNodePositions(new Map());

    // Update all services to tier-based positions
    services.forEach(service => {
      const tierPos = servicePositions.get(service.id);
      if (tierPos) {
        updates.push({ id: service.id, position: tierPos });
      }
    });

    updateNodesPositions(updates);
  }, [services, servicePositions, updateNodesPositions]);

  // Fit to view - center and zoom to show all nodes
  const handleFitView = useCallback(() => {
    if (state.nodes.length === 0) return;

    // Calculate bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    state.nodes.forEach(node => {
      const pos = node.type === 'group'
        ? node.position
        : (nodePositions.get(node.id) ?? servicePositions.get(node.id) ?? node.position);

      const width = node.type === 'group' ? ((node.data.properties?.width as number) ?? 400) : NODE_W;
      const height = node.type === 'group' ? ((node.data.properties?.height as number) ?? 250) : NODE_H;

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + width);
      maxY = Math.max(maxY, pos.y + height);
    });

    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    // Calculate scale to fit
    const scaleX = dimensions.width / boundsWidth;
    const scaleY = dimensions.height / boundsHeight;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

    // Center the bounds
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setScale(newScale);
    setStagePos({
      x: dimensions.width / 2 - centerX * newScale,
      y: dimensions.height / 2 - centerY * newScale,
    });
  }, [state.nodes, nodePositions, servicePositions, dimensions, selectedId, scale]);

  // Performance: Debounce expensive updates
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const shouldUpdate = useCallback((minInterval: number = 16) => {
    const now = Date.now();
    if (now - lastUpdateTime > minInterval) {
      setLastUpdateTime(now);
      return true;
    }
    return false;
  }, [lastUpdateTime]);

  // Animate dashed edges
  const [dashOffset, setDashOffset] = useState(0);
  useEffect(() => {
    const anim = setInterval(() => {
      setDashOffset(prev => (prev + 1) % 8);
    }, 50);
    return () => clearInterval(anim);
  }, []);

  // Alignment tools
  const handleAlignLeft = useCallback(() => {
    if (selectedNodeIds.size < 2) return;

    const nodesToAlign = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToAlign.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      return { id: n.id, x: pos.x, y: pos.y, type: n.type };
    });

    const minX = Math.min(...positions.map(p => p.x));

    const updates = positions.map(p => ({
      id: p.id,
      position: { x: minX, y: p.y }
    }));

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  const handleAlignCenter = useCallback(() => {
    if (selectedNodeIds.size < 2) return;

    const nodesToAlign = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToAlign.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      const width = n.type === 'group' ? ((n.data.properties?.width as number) ?? 400) : NODE_W;
      return { id: n.id, x: pos.x, y: pos.y, width, type: n.type };
    });

    const avgCenterX = positions.reduce((sum, p) => sum + (p.x + p.width / 2), 0) / positions.length;

    const updates = positions.map(p => ({
      id: p.id,
      position: { x: avgCenterX - p.width / 2, y: p.y }
    }));

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  const handleAlignRight = useCallback(() => {
    if (selectedNodeIds.size < 2) return;

    const nodesToAlign = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToAlign.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      const width = n.type === 'group' ? ((n.data.properties?.width as number) ?? 400) : NODE_W;
      return { id: n.id, x: pos.x, y: pos.y, width, type: n.type };
    });

    const maxRight = Math.max(...positions.map(p => p.x + p.width));

    const updates = positions.map(p => ({
      id: p.id,
      position: { x: maxRight - p.width, y: p.y }
    }));

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  const handleAlignTop = useCallback(() => {
    if (selectedNodeIds.size < 2) return;

    const nodesToAlign = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToAlign.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      return { id: n.id, x: pos.x, y: pos.y, type: n.type };
    });

    const minY = Math.min(...positions.map(p => p.y));

    const updates = positions.map(p => ({
      id: p.id,
      position: { x: p.x, y: minY }
    }));

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  const handleAlignMiddle = useCallback(() => {
    if (selectedNodeIds.size < 2) return;

    const nodesToAlign = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToAlign.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      const height = n.type === 'group' ? ((n.data.properties?.height as number) ?? 250) : NODE_H;
      return { id: n.id, x: pos.x, y: pos.y, height, type: n.type };
    });

    const avgCenterY = positions.reduce((sum, p) => sum + (p.y + p.height / 2), 0) / positions.length;

    const updates = positions.map(p => ({
      id: p.id,
      position: { x: p.x, y: avgCenterY - p.height / 2 }
    }));

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  const handleAlignBottom = useCallback(() => {
    if (selectedNodeIds.size < 2) return;

    const nodesToAlign = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToAlign.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      const height = n.type === 'group' ? ((n.data.properties?.height as number) ?? 250) : NODE_H;
      return { id: n.id, x: pos.x, y: pos.y, height, type: n.type };
    });

    const maxBottom = Math.max(...positions.map(p => p.y + p.height));

    const updates = positions.map(p => ({
      id: p.id,
      position: { x: p.x, y: maxBottom - p.height }
    }));

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  // Distribution tools
  const handleDistributeHorizontal = useCallback(() => {
    if (selectedNodeIds.size < 3) return;

    const nodesToDistribute = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToDistribute.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      const width = n.type === 'group' ? ((n.data.properties?.width as number) ?? 400) : NODE_W;
      return { id: n.id, x: pos.x, y: pos.y, width, type: n.type };
    }).sort((a, b) => a.x - b.x); // Sort by x position

    const firstX = positions[0].x;
    const lastX = positions[positions.length - 1].x + positions[positions.length - 1].width;
    const totalWidth = lastX - firstX;
    const nodesWidth = positions.reduce((sum, p) => sum + p.width, 0);
    const spacing = (totalWidth - nodesWidth) / (positions.length - 1);

    let currentX = firstX;
    const updates = positions.map(p => {
      const update = { id: p.id, position: { x: currentX, y: p.y } };
      currentX += p.width + spacing;
      return update;
    });

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  const handleDistributeVertical = useCallback(() => {
    if (selectedNodeIds.size < 3) return;

    const nodesToDistribute = state.nodes.filter(n => selectedNodeIds.has(n.id));
    const positions = nodesToDistribute.map(n => {
      const pos = n.type === 'group' ? n.position : (nodePositions.get(n.id) ?? servicePositions.get(n.id) ?? n.position);
      const height = n.type === 'group' ? ((n.data.properties?.height as number) ?? 250) : NODE_H;
      return { id: n.id, x: pos.x, y: pos.y, height, type: n.type };
    }).sort((a, b) => a.y - b.y); // Sort by y position

    const firstY = positions[0].y;
    const lastY = positions[positions.length - 1].y + positions[positions.length - 1].height;
    const totalHeight = lastY - firstY;
    const nodesHeight = positions.reduce((sum, p) => sum + p.height, 0);
    const spacing = (totalHeight - nodesHeight) / (positions.length - 1);

    let currentY = firstY;
    const updates = positions.map(p => {
      const update = { id: p.id, position: { x: p.x, y: currentY } };
      currentY += p.height + spacing;
      return update;
    });

    updateNodesPositions(updates);
  }, [selectedNodeIds, state.nodes, nodePositions, servicePositions, updateNodesPositions]);

  // Export diagram as PNG
  const handleExportPNG = useCallback(() => {
    if (!stageRef.current) return;

    const uri = stageRef.current.toDataURL({
      pixelRatio: 2, // Higher quality
      mimeType: 'image/png',
    });

    // Download the image
    const link = document.createElement('a');
    link.download = `azure-architecture-${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Pre-compute safe routing corridors from the subnet layout.
  // A corridor is the midpoint X of the gap between adjacent subnets — edges can travel
  // vertically there without passing through any service node.
  const routingInfo = useMemo(() => {
    const subnets = state.nodes
      .filter(n => n.type === 'group' && n.data.groupType === 'subnet')
      .map(n => ({
        id: n.id,
        x: n.position.x,
        w: (n.data.properties?.width as number) ?? 400,
      }))
      .sort((a, b) => a.x - b.x);

    const corridorXs: number[] = [];
    for (let i = 0; i < subnets.length - 1; i++) {
      const s1 = subnets[i];
      const s2 = subnets[i + 1];
      // Mid-point of the gap between s1's right edge and s2's left edge
      corridorXs.push(s1.x + s1.w + (s2.x - (s1.x + s1.w)) / 2);
    }
    // Corridor just outside the rightmost subnet (for reverse or long edges)
    if (subnets.length > 0) {
      const last = subnets[subnets.length - 1];
      corridorXs.push(last.x + last.w + 40);
    }

    return { corridorXs };
  }, [state.nodes]);

  // Route an edge through a safe corridor, keeping the vertical segment
  // in the gap between subnets (never inside a service node rectangle).
  // fanOffset: Y offset to stagger multiple edges between the same source/target pair.
  const routeEdgeSmart = useCallback((
    srcNodeId: string, tgtNodeId: string,
    srcX: number, srcY: number,
    tgtX: number, tgtY: number,
    fanOffset: number = 0,
  ): number[] => {
    const oSrcY = srcY + fanOffset;
    const oTgtY = tgtY + fanOffset;

    // Straight horizontal — direct line
    if (Math.abs(oSrcY - oTgtY) < 5) return [srcX, oSrcY, tgtX, oTgtY];

    const srcNode = state.nodes.find(n => n.id === srcNodeId);
    const tgtNode = state.nodes.find(n => n.id === tgtNodeId);

    // Same logical parent → detour 30px past the rightmost node exit point.
    const srcParent = srcNode?.data.logicalParent;
    const tgtParent = tgtNode?.data.logicalParent;
    if (srcParent && srcParent === tgtParent) {
      const sideX = Math.max(srcX, tgtX) + 30;
      return [srcX, oSrcY, sideX, oSrcY, sideX, oTgtY, tgtX, oTgtY];
    }

    // Cross-container → find a corridor in the X range between source and target.
    const lo = Math.min(srcX, tgtX);
    const hi = Math.max(srcX, tgtX);
    const { corridorXs } = routingInfo;
    const inRange = corridorXs.filter(cx => cx > lo && cx < hi);
    const corridorX = inRange.length > 0
      ? inRange[Math.floor(inRange.length / 2)]
      : (lo + hi) / 2;

    return [srcX, oSrcY, corridorX, oSrcY, corridorX, oTgtY, tgtX, oTgtY];
  }, [state.nodes, routingInfo]);

  // Visual style per connection type — color communicates the security/routing model
  const CONNECTION_STYLES: Record<string, { stroke: string; dash: number[]; sw: number; badge: string | null }> = {
    'private-endpoint': { stroke: '#34d399', dash: [],      sw: 2.5, badge: 'PE'   },
    'vnet-integration': { stroke: '#a78bfa', dash: [6, 3],  sw: 2,   badge: 'VNet' },
    'service-endpoint': { stroke: '#fb923c', dash: [4, 4],  sw: 2,   badge: 'SE'   },
    'peering':          { stroke: '#22d3ee', dash: [10, 5], sw: 2,   badge: 'Peer' },
    'public':           { stroke: '#94a3b8', dash: [8, 4],  sw: 1.5, badge: null   },
  };

  // Generate grid lines — Cartesian in 2D, iso diamond in isometric mode
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const isIso = state.viewMode === 'isometric';

    if (!isIso) {
      // Cartesian square grid (2D / heatmap / compliance modes)
      const gridColor = '#1a2332';
      const width = 4000;
      const height = 3000;
      for (let x = 0; x <= width; x += GRID_SIZE) {
        lines.push(<Line key={`v-${x}`} points={[x, 0, x, height]} stroke={gridColor} strokeWidth={1} opacity={0.3} listening={false} />);
      }
      for (let y = 0; y <= height; y += GRID_SIZE) {
        lines.push(<Line key={`h-${y}`} points={[0, y, width, y]} stroke={gridColor} strokeWidth={1} opacity={0.3} listening={false} />);
      }
      return lines;
    }

    // Isometric diamond grid — two families of ±30° diagonal lines
    // Family A: slope +0.5 (y = 0.5x + b)  →  NE direction
    // Family B: slope -0.5 (y = -0.5x + b) →  NW direction
    // Cell height = ISO_HALF_DH (20px) — minor lines every 20px, major every 40px
    const W = 5000; const H = 4000; const OVER = 1000;
    const step = ISO_HALF_DH; // 20px between parallel lines
    const majorColor = '#2d5080';
    const minorColor = '#1e3860';

    for (let b = -(H + OVER); b <= H + OVER; b += step) {
      const isMajor = (Math.round(b / step) % 2 === 0);
      // Family A: y = 0.5x + b
      lines.push(
        <Line key={`ia-${b}`}
          points={[-OVER, 0.5 * -OVER + b,  W + OVER, 0.5 * (W + OVER) + b]}
          stroke={isMajor ? majorColor : minorColor}
          strokeWidth={isMajor ? 1.5 : 0.75}
          opacity={isMajor ? 0.7 : 0.35}
          listening={false}
        />
      );
      // Family B: y = -0.5x + b
      lines.push(
        <Line key={`ib-${b}`}
          points={[-OVER, -0.5 * -OVER + b,  W + OVER, -0.5 * (W + OVER) + b]}
          stroke={isMajor ? majorColor : minorColor}
          strokeWidth={isMajor ? 1.5 : 0.75}
          opacity={isMajor ? 0.7 : 0.35}
          listening={false}
        />
      );
    }
    return lines;
  }, [state.viewMode]);

  // Edge fan-out: stagger multiple edges that share the same source→target pair
  const edgeFanMap = useMemo(() => {
    const pairCount = new Map<string, number>();
    state.edges.forEach(edge => {
      const key = `${edge.source}|${edge.target}`;
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    });
    const pairIndex = new Map<string, number>();
    const result = new Map<string, number>(); // edgeId → fanOffset (px)
    state.edges.forEach(edge => {
      const key = `${edge.source}|${edge.target}`;
      const total = pairCount.get(key) ?? 1;
      const idx = pairIndex.get(key) ?? 0;
      pairIndex.set(key, idx + 1);
      // Spread edges ±(total-1)*8 px around centre, step 16px
      const offset = total > 1 ? (idx - (total - 1) / 2) * 16 : 0;
      result.set(edge.id, offset);
    });
    return result;
  }, [state.edges]);

  // Cost heatmap: derive fill colour for each service node based on its monthly cost
  const maxNodeCost = useMemo(
    () => Math.max(0, ...services.map(s => s.data.monthlyCost ?? 0)),
    [services]
  );
  const heatFill = useCallback((cost: number): string => {
    if (maxNodeCost === 0 || cost === 0) return '#1e293b'; // default dark card
    const ratio = cost / maxNodeCost;
    if (ratio < 0.33) return '#14532d'; // dark green  — cheap
    if (ratio < 0.66) return '#78350f'; // dark amber  — moderate
    return '#7f1d1d';                   // dark red    — expensive
  }, [maxNodeCost]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0f1729' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={!dragConnection}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        onWheel={handleWheel}
        onMouseMove={handleStageMoveForConnection}
        onMouseUp={handleStageMouseUpForConnection}
        onDragEnd={(e) => {
          if (e.target === e.currentTarget) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handlePaneClick();
          }
        }}
      >
        <Layer>
          {/* Grid background */}
          {gridLines}

          {/* Render edges/connections */}
          {state.edges.map((edge) => {
            const sourceNode = state.nodes.find(n => n.id === edge.source);
            const targetNode = state.nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            // Use nodePositions (drag state) first, then node.position (layout result).
            // Never fall back to servicePositions — those use old TIER_X values and go off-screen.
            const sourcePos = nodePositions.get(edge.source) ?? sourceNode.position;
            const targetPos = nodePositions.get(edge.target) ?? targetNode.position;

            const isIsoMode = state.viewMode === 'isometric';
            const srcW = sourceNode.type === 'group' ? (sourceNode.data.properties?.width as number ?? 400) : isIsoMode ? ISO_DW : NODE_W;
            const srcH = sourceNode.type === 'group' ? (sourceNode.data.properties?.height as number ?? 250) : isIsoMode ? ISO_DH : NODE_H;
            const tgtW = targetNode.type === 'group' ? (targetNode.data.properties?.width as number ?? 400) : isIsoMode ? ISO_DW : NODE_W;
            const tgtH = targetNode.type === 'group' ? (targetNode.data.properties?.height as number ?? 250) : isIsoMode ? ISO_DH : NODE_H;

            const srcCenterX = sourcePos.x + srcW / 2;
            const tgtCenterX = targetPos.x + tgtW / 2;

            // Exit from right edge of source, enter left edge of target (left-to-right).
            // Reverse for right-to-left connections.
            let srcX: number, srcY: number, tgtX: number, tgtY: number;
            if (srcCenterX <= tgtCenterX) {
              srcX = sourcePos.x + srcW;
              srcY = sourcePos.y + srcH / 2;
              tgtX = targetPos.x;
              tgtY = targetPos.y + tgtH / 2;
            } else {
              srcX = sourcePos.x;
              srcY = sourcePos.y + srcH / 2;
              tgtX = targetPos.x + tgtW;
              tgtY = targetPos.y + tgtH / 2;
            }

            // Route through a safe corridor — never through service node interiors
            const fanOffset = edgeFanMap.get(edge.id) ?? 0;
            const pathPoints = routeEdgeSmart(edge.source, edge.target, srcX, srcY, tgtX, tgtY, fanOffset);

            // Style by connection type
            const connType = edge.data?.connectionType ?? 'public';
            const style = CONNECTION_STYLES[connType] ?? CONNECTION_STYLES['public'];
            const isSelected = state.selectedEdgeId === edge.id;
            const stroke = isSelected ? '#ffffff' : style.stroke;
            const strokeWidth = isSelected ? style.sw + 1.5 : style.sw;
            const dash = isSelected ? [] : style.dash;

            // Badge label position: midpoint of the vertical corridor segment
            // Path is always [x1,y1, cx,y1, cx,y2, x2,y2] (8 points)
            const hasBadge = style.badge !== null && pathPoints.length === 8;
            const badgeX = hasBadge ? pathPoints[4] : 0;        // corridor X
            const badgeY = hasBadge ? (pathPoints[3] + pathPoints[5]) / 2 : 0; // mid-Y of vertical

            return (
              <Group key={edge.id}>
                <Arrow
                  points={pathPoints}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  fill={stroke}
                  pointerLength={isSelected ? 10 : 7}
                  pointerWidth={isSelected ? 10 : 7}
                  opacity={isSelected ? 1 : 0.75}
                  listening={true}
                  lineCap="round"
                  lineJoin="round"
                  dash={dash}
                  dashOffset={dash.length > 0 ? -dashOffset : 0}
                  onClick={(e) => handleEdgeClick(edge.id, e)}
                  onContextMenu={(e) => handleEdgeContextMenu(edge.id, e)}
                  hitStrokeWidth={20}
                />
                {hasBadge && (
                  <>
                    <Rect
                      x={badgeX - 18}
                      y={badgeY - 9}
                      width={36}
                      height={18}
                      fill={style.stroke}
                      opacity={0.9}
                      cornerRadius={4}
                      listening={false}
                    />
                    <Text
                      x={badgeX - 18}
                      y={badgeY - 9}
                      width={36}
                      height={18}
                      text={style.badge!}
                      fontSize={9}
                      fontStyle="bold"
                      fill="#fff"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </>
                )}
              </Group>
            );
          })}

          {/* Render groups (containers) */}
          {groups.map((group) => {
            // Use pre-calculated position and dimensions from layout algorithm
            // The layout algorithm (tierLayoutSimple) already calculated optimal positions
            // and stored dimensions in node.data.properties
            const groupX = group.position.x;
            const groupY = group.position.y;
            const width = group.data.properties?.width as number ?? 400;
            const height = group.data.properties?.height as number ?? 250;

            const isSelected = selectedId === group.id || selectedNodeIds.has(group.id);

            // --- ISOMETRIC GROUP: true iso diamond (rhombus) ---
            // All 4 edges follow iso grid lines exactly (slopes ±0.5), like the red overlay in the design.
            // Shape: Top(W/2, 0), Right(W, dH/2), Bottom(W/2, dH), Left(0, dH/2)
            // where dH = W/2  →  all edges have slope = ±dH/2 / (W/2) = ±0.5 ✓
            if (state.viewMode === 'isometric') {
              const isoGroupStyles = {
                'resource-group': { fillColor: '#1e40af', fillOpacity: 0.06, stroke: '#60a5fa', labelColor: '#93c5fd' },
                'virtual-network': { fillColor: '#065f46', fillOpacity: 0.08, stroke: '#34d399', labelColor: '#6ee7b7' },
                'subnet':          { fillColor: '#4c1d95', fillOpacity: 0.10, stroke: '#a78bfa', labelColor: '#c4b5fd' },
              };
              const gs = isoGroupStyles[group.data.groupType as keyof typeof isoGroupStyles]
                       ?? isoGroupStyles['resource-group'];

              // Diamond: W × (W/2) bounding box. All edges slope ±0.5 — traces the iso grid exactly.
              const dH = width * 0.5;  // diamond height = W/2
              const diamondPoints = [
                width / 2, 0,       // Top vertex
                width,     dH / 2,  // Right vertex  (= W/4 from top)
                width / 2, dH,      // Bottom vertex
                0,         dH / 2,  // Left vertex
              ];

              // Label sits ON the top-right edge, rotated +26.57° (downhill, same as App-VNet/Subnet labels).
              const labelText = group.data.displayName;
              // Measure actual text width so the pill always fits the label exactly.
              // 20px padding = 10px each side.
              const labelW = measureTextWidth(labelText, 11, '600') + 20;
              const ISO_EDGE_ANGLE = Math.atan(0.5) * (180 / Math.PI); // ≈ 26.57°
              const labelAnchorX = width / 2;
              const labelAnchorY = 0;

              return (
                <Group key={group.id} x={groupX} y={groupY} draggable={false}
                  onContextMenu={(e) => handleNodeContextMenu(group.id, e)}>
                  {/* Filled diamond background */}
                  <Line
                    points={diamondPoints}
                    closed
                    fill={gs.fillColor}
                    opacity={gs.fillOpacity}
                    stroke="transparent"
                    strokeWidth={0}
                    listening={false}
                  />
                  {/* Dashed diamond border — all 4 edges follow iso grid lines */}
                  <Line
                    points={diamondPoints}
                    closed
                    fill="transparent"
                    stroke={isSelected ? '#fbbf24' : gs.stroke}
                    strokeWidth={isSelected ? 2 : 1.5}
                    dash={[12, 6]}
                    shadowColor={isSelected ? '#fbbf24' : 'transparent'}
                    shadowBlur={isSelected ? 12 : 0}
                    shadowOpacity={isSelected ? 0.5 : 0}
                    listening={false}
                  />
                  {/* Label parallelogram — sits ABOVE the top-right edge.
                      Bottom edge (y=0) lies on the diamond edge line.
                      Top edge (y=-pH) lies on the next outer grid line (~17.9px away).
                      Left/right sides follow the -26.57° grid family (shear = pH * 0.75). */}
                  <Group
                    x={labelAnchorX}
                    y={labelAnchorY}
                    rotation={ISO_EDGE_ANGLE}
                  >
                    {(() => {
                      const pH = 18;
                      const shear = pH * 0.75; // 13.5px — side edges follow -26.57° grid family
                      const r = 5;             // corner radius
                      const W = labelW;
                      // Parallelogram corners: bottom on edge (y=0), top above (y=-pH)
                      const P0 = [4,           0  ];       // BL (on edge)
                      const P1 = [4 + W,       0  ];       // BR (on edge)
                      const P2 = [4 + W + shear, -pH];     // TR (above edge)
                      const P3 = [4 + shear,   -pH];       // TL (above edge)
                      // Edge unit vectors (same family as iso grid sides)
                      const e01: [number,number] = [1, 0];         // bottom: →
                      const e12: [number,number] = [0.6, -0.8];    // right side: ↗
                      const e23: [number,number] = [-1, 0];        // top: ←
                      const e30: [number,number] = [-0.6, 0.8];    // left side: ↙
                      return (
                        <>
                          {/* Properly rounded parallelogram via canvas quadraticCurveTo */}
                          <Shape
                            sceneFunc={(ctx, shape) => {
                              ctx.beginPath();
                              // Start: r before BL along incoming left-side edge
                              ctx.moveTo(P0[0] - r*e30[0], P0[1] - r*e30[1]);
                              ctx.quadraticCurveTo(P0[0], P0[1], P0[0]+r*e01[0], P0[1]+r*e01[1]);
                              ctx.lineTo(P1[0]-r*e01[0], P1[1]-r*e01[1]);
                              ctx.quadraticCurveTo(P1[0], P1[1], P1[0]+r*e12[0], P1[1]+r*e12[1]);
                              ctx.lineTo(P2[0]-r*e12[0], P2[1]-r*e12[1]);
                              ctx.quadraticCurveTo(P2[0], P2[1], P2[0]+r*e23[0], P2[1]+r*e23[1]);
                              ctx.lineTo(P3[0]-r*e23[0], P3[1]-r*e23[1]);
                              ctx.quadraticCurveTo(P3[0], P3[1], P3[0]+r*e30[0], P3[1]+r*e30[1]);
                              ctx.closePath();
                              ctx.fillStrokeShape(shape);
                            }}
                            fill={gs.stroke}
                            opacity={0.40}
                            listening={false}
                          />
                          {/* Text skewed to match parallelogram lean: skewX = -shear/pH = -0.75
                              x is computed so the visual gap is equal on both sides.
                              Because skewX shifts the text left, we must offset rightward by
                              pillLeftAtTextTopY (left edge of pill at text's y) + padding. */}
                          <Text
                            text={labelText}
                            x={4 + shear * (pH - 4) / pH + 10}
                            y={-pH + 4}
                            skewX={-(shear / pH)}
                            fontSize={11} fontStyle="600"
                            fill={gs.labelColor}
                            onClick={() => handleNodeClick(group.id)}
                          />
                        </>
                      );
                    })()}
                  </Group>
                </Group>
              );
            }

            // Professional Azure-style group rendering - subtle, almost invisible fills
            const styles = {
              'resource-group': {
                stroke: '#60a5fa',      // blue-400 (softer)
                fill: '#dbeafe',        // blue-100
                fillOpacity: 0.04,      // Almost invisible (was 0.12)
                headerFill: '#3b82f6', // blue-500
                headerOpacity: 0.15,
                labelColor: '#ffffff',  // white for better contrast
                labelBg: '#3b82f6',     // blue-500
                labelBgOpacity: 0.85,
              },
              'virtual-network': {
                stroke: '#34d399',      // green-400 (softer)
                fill: '#d1fae5',        // green-100
                fillOpacity: 0.05,      // Almost invisible (was 0.15)
                headerFill: '#10b981', // green-500
                headerOpacity: 0.18,
                labelColor: '#ffffff',
                labelBg: '#10b981',
                labelBgOpacity: 0.85,
              },
              'subnet': {
                stroke: '#a78bfa',      // purple-400 (softer)
                fill: '#ede9fe',        // purple-100
                fillOpacity: 0.06,      // Almost invisible (was 0.18)
                headerFill: '#8b5cf6', // purple-500
                headerOpacity: 0.20,
                labelColor: '#ffffff',
                labelBg: '#8b5cf6',
                labelBgOpacity: 0.85,
              },
            };
            const style = styles[group.data.groupType as keyof typeof styles] || styles['resource-group'];

            return (
              <Group
                key={group.id}
                x={groupX}
                y={groupY}
                draggable={false}
                onContextMenu={(e) => handleNodeContextMenu(group.id, e)}
              >
                {/* Background fill — listening={false} so clicks pass through to edges/services below */}
                <Rect
                  width={width}
                  height={height}
                  fill={style.fill}
                  opacity={style.fillOpacity}
                  cornerRadius={12}
                  listening={false}
                />

                {/* Border — listening={false} so the bounding-box hit area doesn't block edge clicks */}
                <Rect
                  width={width}
                  height={height}
                  stroke={isSelected ? '#fbbf24' : style.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                  cornerRadius={12}
                  shadowColor={isSelected ? '#fbbf24' : 'transparent'}
                  shadowBlur={isSelected ? 15 : 0}
                  shadowOpacity={isSelected ? 0.5 : 0}
                  listening={false}
                />

                {/* Header bar — clicking the header selects the group */}
                <Rect
                  width={width}
                  height={40}
                  fill={style.headerFill}
                  opacity={style.headerOpacity}
                  cornerRadius={[12, 12, 0, 0]}
                  onClick={() => handleNodeClick(group.id)}
                />

                {/* Label pill */}
                <Rect
                  x={12}
                  y={10}
                  width={group.data.displayName.length * 8 + 16}
                  height={20}
                  fill={style.labelBg}
                  opacity={style.labelBgOpacity}
                  cornerRadius={4}
                  onClick={() => handleNodeClick(group.id)}
                />

                <Text
                  text={group.data.displayName}
                  x={20}
                  y={13}
                  fontSize={13}
                  fontStyle="600"
                  fill={style.labelColor}
                  onClick={() => handleNodeClick(group.id)}
                />
              </Group>
            );
          })}

          {/* Render service nodes */}
          {services.map((service) => {
            // Use service.position from layout algorithm, NOT servicePositions tier calculation
            const basePos = service.position ?? { x: 0, y: 0 };
            const pos = nodePositions.get(service.id) ?? basePos;
            const categoryColor = CATEGORY_COLORS[service.data.category] || '#3b82f6';
            const serviceInitial = service.data.serviceType.charAt(0).toUpperCase();
            const isSelected = selectedId === service.id || selectedNodeIds.has(service.id);
            const isHovered = hoveredNodeId === service.id;
            const isDragSource = dragConnection?.sourceId === service.id;
            const isDragTarget = connectionTargetId === service.id;
            const monthlyCost = service.data.monthlyCost ?? 0;
            const status = service.data.status || 'proposed';

            // Status colors — must match NodeStatus type: proposed | healthy | warning | error
            const statusColors: Record<string, { bg: string; text: string }> = {
              proposed: { bg: '#3b82f6', text: 'Proposed' },
              healthy:  { bg: '#10b981', text: 'Healthy' },
              warning:  { bg: '#f59e0b', text: 'Warning' },
              error:    { bg: '#ef4444', text: 'Error' },
            };
            const statusInfo = statusColors[status] ?? statusColors.proposed;

            // View-mode overlays
            const isHeatmap = state.viewMode === 'cost-heatmap';
            const isCompliance = state.viewMode === 'compliance';
            const cardFill = isHeatmap ? heatFill(monthlyCost) : '#1e293b';

            // Compliance border: worst WAF finding for this node
            const nodeFindings = state.validationResults?.filter(f => f.nodeId === service.id) ?? [];
            const hasCritical = nodeFindings.some(f => f.severity === 'critical');
            const hasWarning = nodeFindings.some(f => f.severity === 'warning');
            const complianceBorder = isCompliance
              ? hasCritical ? '#ef4444' : hasWarning ? '#f59e0b' : '#10b981'
              : null;

            // Shared event handler props for both iso and 2D
            const sharedGroupProps = {
              x: pos.x,
              y: pos.y,
              draggable: !dragConnection,
              onDragEnd: (e: any) => handleServiceDragEnd(service.id, e.target.x(), e.target.y()),
              onClick: () => handleNodeClick(service.id),
              onContextMenu: (e: any) => handleNodeContextMenu(service.id, e),
              onMouseEnter: () => {
                setHoveredNodeId(service.id);
                if (dragConnection && dragConnection.sourceId !== service.id) {
                  setConnectionTargetId(service.id);
                }
              },
              onMouseLeave: () => {
                setHoveredNodeId(null);
                if (connectionTargetId === service.id) setConnectionTargetId(null);
              },
            };

            // --- ISOMETRIC VIEW (small flat diamond cube style, matches old GenericAzureNode) ---
            if (state.viewMode === 'isometric') {
              const faceStroke  = isSelected ? '#fbbf24' : isDragTarget ? '#34d399' : ISO_STROKE_COLOR;
              const faceStrokeW = (isSelected || isDragTarget) ? 2 : 0.75;

              // Category accent stripe: top 40% of the top diamond
              const accentT = 0.40;
              const accentFace = [
                ISO_HALF_DW,                        0,
                ISO_HALF_DW + ISO_HALF_DW * accentT, ISO_HALF_DH * accentT,
                ISO_HALF_DW,                        ISO_DH * accentT,
                ISO_HALF_DW - ISO_HALF_DW * accentT, ISO_HALF_DH * accentT,
              ];

              return (
                <Group key={service.id} {...sharedGroupProps}>
                  {/* Left face (shadow side) — drawn first */}
                  <Line points={ISO_LEFT_FACE} closed
                    fill={ISO_LEFT_COLOR}
                    stroke={faceStroke} strokeWidth={faceStrokeW}
                    listening={false}
                  />
                  {/* Right face (lit side) */}
                  <Line points={ISO_RIGHT_FACE} closed
                    fill={ISO_RIGHT_COLOR}
                    stroke={faceStroke} strokeWidth={faceStrokeW}
                    listening={false}
                  />
                  {/* Top face (lightest) — rendered last, sits on top */}
                  <Line points={ISO_TOP_FACE} closed
                    fill={ISO_TOP_COLOR}
                    stroke={faceStroke} strokeWidth={faceStrokeW}
                    shadowColor={isSelected ? '#fbbf24' : isDragTarget ? '#34d399' : 'transparent'}
                    shadowBlur={isSelected || isDragTarget ? 16 : 0}
                    shadowOpacity={isSelected || isDragTarget ? 0.9 : 0}
                    listening={false}
                  />

                  {/* Category accent stripe on top face */}
                  <Line points={accentFace} closed
                    fill={categoryColor}
                    opacity={0.85}
                    stroke="transparent"
                    strokeWidth={0}
                    listening={false}
                  />

                  {/* White icon badge (small square behind icon) */}
                  <Rect
                    x={ISO_HALF_DW - ISO_ICON / 2 - 2}
                    y={ISO_HALF_DH - ISO_ICON / 2 - 2}
                    width={ISO_ICON + 4}
                    height={ISO_ICON + 4}
                    fill="white"
                    cornerRadius={3}
                    opacity={0.88}
                    listening={false}
                  />

                  {/* Icon — flat, centered on top face */}
                  {iconImages[service.data.serviceType] ? (
                    <KonvaImage
                      image={iconImages[service.data.serviceType]}
                      x={ISO_HALF_DW - ISO_ICON / 2}
                      y={ISO_HALF_DH - ISO_ICON / 2}
                      width={ISO_ICON}
                      height={ISO_ICON}
                      listening={false}
                    />
                  ) : (
                    <Text
                      text={serviceInitial}
                      x={ISO_HALF_DW - 6}
                      y={ISO_HALF_DH - 7}
                      fontSize={12}
                      fontStyle="bold"
                      fill="#334155"
                      listening={false}
                    />
                  )}

                  {/* Validation badge — at right vertex of top face */}
                  {state.validationResults?.some(f => f.nodeId === service.id &&
                    (f.severity === 'critical' || f.severity === 'warning')) && (
                    <Circle
                      x={ISO_DW - 6}
                      y={ISO_HALF_DH - 6}
                      radius={6}
                      fill={hasCritical ? '#ef4444' : '#f59e0b'}
                      shadowBlur={4}
                      shadowOpacity={0.6}
                    />
                  )}

                  {/* Service name label below cube */}
                  <Text
                    text={service.data.displayName}
                    x={-ISO_HALF_DW}
                    y={ISO_DH + ISO_D + 4}
                    width={ISO_DW * 2}
                    fontSize={10}
                    fontStyle="500"
                    fill="#cbd5e1"
                    align="center"
                    ellipsis
                    wrap="none"
                    listening={false}
                  />

                  {/* Cost label below name (in iso mode, always visible if non-zero) */}
                  {monthlyCost > 0 && (
                    <Text
                      text={`$${monthlyCost < 1000 ? Math.round(monthlyCost) : `${(monthlyCost / 1000).toFixed(1)}k`}/mo`}
                      x={-ISO_HALF_DW}
                      y={ISO_DH + ISO_D + 16}
                      width={ISO_DW * 2}
                      fontSize={8}
                      fill="#34d399"
                      align="center"
                      listening={false}
                    />
                  )}

                  {/* Port handle — at right vertex of top diamond */}
                  {(isHovered || isDragSource) && !dragConnection && (
                    <Circle
                      x={ISO_DW}
                      y={ISO_HALF_DH}
                      radius={6}
                      fill="#10b981"
                      stroke="#fff"
                      strokeWidth={1.5}
                      shadowColor="#10b981"
                      shadowBlur={8}
                      shadowOpacity={0.8}
                      onMouseDown={(e) => handlePortMouseDown(service.id, e)}
                      onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'crosshair'; }}
                      onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
                    />
                  )}
                </Group>
              );
            }

            return (
              <Group
                key={service.id}
                x={pos.x}
                y={pos.y}
                draggable={!dragConnection}
                onDragEnd={(e) => handleServiceDragEnd(service.id, e.target.x(), e.target.y())}
                onClick={() => handleNodeClick(service.id)}
                onContextMenu={(e) => handleNodeContextMenu(service.id, e)}
                onMouseEnter={() => {
                  setHoveredNodeId(service.id);
                  if (dragConnection && dragConnection.sourceId !== service.id) {
                    setConnectionTargetId(service.id);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredNodeId(null);
                  if (connectionTargetId === service.id) setConnectionTargetId(null);
                }}
              >
                {/* Background card */}
                <Rect
                  width={NODE_W}
                  height={NODE_H}
                  fill={cardFill}
                  cornerRadius={8}
                  shadowColor={isSelected ? '#fbbf24' : complianceBorder ?? '#000000'}
                  shadowBlur={isSelected ? 25 : complianceBorder ? 18 : 20}
                  shadowOpacity={isSelected ? 1 : complianceBorder ? 0.8 : 0.6}
                  shadowOffsetY={6}
                  shadowOffsetX={0}
                />

                {/* Border: gold=selected, compliance=severity color, drag=green, default=subtle */}
                <Rect
                  width={NODE_W}
                  height={NODE_H}
                  stroke={
                    isSelected ? categoryColor
                    : complianceBorder ?? (isDragSource ? '#10b981' : isDragTarget ? '#34d399' : '#2d3748')
                  }
                  strokeWidth={isSelected || complianceBorder || isDragSource || isDragTarget ? 2.5 : 1}
                  cornerRadius={8}
                  shadowColor={isDragTarget ? '#34d399' : 'transparent'}
                  shadowBlur={isDragTarget ? 12 : 0}
                  shadowOpacity={isDragTarget ? 0.6 : 0}
                />

                {/* Status indicator dot */}
                <Circle
                  x={6}
                  y={6}
                  radius={3}
                  fill={statusInfo.bg}
                />

                {/* Validation warning indicator */}
                {state.validationResults?.some(f =>
                  f.nodeId === service.id && (f.severity === 'critical' || f.severity === 'warning')
                ) && (
                  <>
                    <Circle
                      x={NODE_W - 8}
                      y={8}
                      radius={7}
                      fill="#fbbf24"
                      shadowColor="#000000"
                      shadowBlur={3}
                      shadowOpacity={0.5}
                    />
                    <Text
                      text="!"
                      x={NODE_W - 11}
                      y={3}
                      fontSize={10}
                      fontStyle="bold"
                      fill="#1e293b"
                    />
                  </>
                )}

                {/* Icon background - rounded square for better professional look */}
                <Rect
                  x={10}
                  y={(NODE_H - ICON_SIZE) / 2}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  fill={categoryColor}
                  cornerRadius={6}
                  shadowColor={categoryColor}
                  shadowBlur={10}
                  shadowOpacity={0.5}
                />

                {/* Azure Service Icon */}
                {iconImages[service.data.serviceType] ? (
                  <KonvaImage
                    image={iconImages[service.data.serviceType]}
                    x={14}
                    y={(NODE_H - ICON_SIZE) / 2 + 4}
                    width={ICON_SIZE - 8}
                    height={ICON_SIZE - 8}
                  />
                ) : (
                  // Fallback to initial letter while icon loads
                  <Text
                    text={serviceInitial}
                    x={10}
                    y={(NODE_H - ICON_SIZE) / 2}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    fontSize={16}
                    fontStyle="bold"
                    fill="white"
                    align="center"
                    verticalAlign="middle"
                  />
                )}

                {/* Service name */}
                <Text
                  text={service.data.displayName}
                  x={10 + ICON_SIZE + 10}
                  y={14}
                  width={NODE_W - (10 + ICON_SIZE + 10 + 65)}
                  fontSize={12}
                  fontStyle="600"
                  fill="#e2e8f0"
                  wrap="none"
                  ellipsis
                />

                {/* Service type */}
                <Text
                  text={service.data.serviceType.replace(/-/g, ' ')}
                  x={10 + ICON_SIZE + 10}
                  y={30}
                  width={NODE_W - (10 + ICON_SIZE + 10 + 65)}
                  fontSize={9}
                  fill="#64748b"
                  wrap="none"
                  ellipsis
                />

                {/* Cost badge (if has cost) */}
                {monthlyCost > 0 && (
                  <>
                    <Rect
                      x={NODE_W - 50}
                      y={28}
                      width={45}
                      height={14}
                      fill="#059669"
                      cornerRadius={4}
                    />
                    <Text
                      text={`$${Math.round(monthlyCost)}`}
                      x={NODE_W - 50}
                      y={29}
                      width={45}
                      fontSize={9}
                      fill="white"
                      align="center"
                      fontStyle="600"
                    />
                  </>
                )}

                {/* Heatmap: prominent cost label when in cost-heatmap mode */}
                {isHeatmap && monthlyCost > 0 && (
                  <Text
                    text={`$${monthlyCost < 1000 ? Math.round(monthlyCost) : `${(monthlyCost / 1000).toFixed(1)}k`}/mo`}
                    x={0}
                    y={NODE_H - 16}
                    width={NODE_W}
                    fontSize={10}
                    fontStyle="bold"
                    fill="#fde68a"
                    align="center"
                    listening={false}
                  />
                )}

                {/* Compliance: severity badge label */}
                {isCompliance && complianceBorder && (
                  <>
                    <Rect
                      x={NODE_W - 52}
                      y={NODE_H - 20}
                      width={48}
                      height={16}
                      fill={complianceBorder}
                      cornerRadius={3}
                      opacity={0.9}
                      listening={false}
                    />
                    <Text
                      text={hasCritical ? '⚠ CRIT' : '⚠ WARN'}
                      x={NODE_W - 52}
                      y={NODE_H - 20}
                      width={48}
                      height={16}
                      fontSize={8}
                      fontStyle="bold"
                      fill="#fff"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </>
                )}

                {/* Port handle — visible on hover, drag from here to create a connection */}
                {(isHovered || isDragSource) && !dragConnection && (
                  <Circle
                    x={NODE_W}
                    y={NODE_H / 2}
                    radius={8}
                    fill="#10b981"
                    stroke="#fff"
                    strokeWidth={2}
                    shadowColor="#10b981"
                    shadowBlur={8}
                    shadowOpacity={0.7}
                    onMouseDown={(e) => handlePortMouseDown(service.id, e)}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'crosshair'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
                  />
                )}
              </Group>
            );
          })}

          {/* Rubber-band connection line (shown while dragging from a port) */}
          {dragConnection && (
            <Arrow
              points={[
                dragConnection.startX, dragConnection.startY,
                dragConnection.currentX, dragConnection.currentY,
              ]}
              stroke="#10b981"
              strokeWidth={2}
              fill="#10b981"
              dash={[6, 4]}
              pointerLength={8}
              pointerWidth={8}
              opacity={0.85}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* Controls overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button
          onClick={handleExportPNG}
          className="w-9 h-9 bg-emerald-600/80 hover:bg-emerald-500/90 text-white rounded-md shadow-xl flex items-center justify-center transition-colors backdrop-blur-sm border border-emerald-500/50 text-xs"
          title="Export as PNG"
        >
          💾
        </button>
        <button
          onClick={handleAutoLayout}
          className="w-9 h-9 bg-blue-600/80 hover:bg-blue-500/90 text-white rounded-md shadow-xl flex items-center justify-center transition-colors backdrop-blur-sm border border-blue-500/50 text-xs"
          title="Auto Layout"
        >
          ⚡
        </button>
        <button
          onClick={handleFitView}
          className="w-9 h-9 bg-purple-600/80 hover:bg-purple-500/90 text-white rounded-md shadow-xl flex items-center justify-center transition-colors backdrop-blur-sm border border-purple-500/50 text-xs"
          title="Fit to View"
        >
          ⊞
        </button>
        <button
          onClick={() => setScale(s => Math.min(3, s * 1.2))}
          className="w-9 h-9 bg-slate-800/80 hover:bg-slate-700/90 text-white rounded-md shadow-xl flex items-center justify-center transition-colors backdrop-blur-sm border border-slate-700/50"
          title="Zoom in"
        >
          <span className="text-lg font-light">+</span>
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.1, s / 1.2))}
          className="w-9 h-9 bg-slate-800/80 hover:bg-slate-700/90 text-white rounded-md shadow-xl flex items-center justify-center transition-colors backdrop-blur-sm border border-slate-700/50"
          title="Zoom out"
        >
          <span className="text-lg font-light">−</span>
        </button>
        <button
          onClick={() => {
            setScale(1);
            setStagePos({ x: 0, y: 0 });
          }}
          className="w-9 h-9 bg-slate-800/80 hover:bg-slate-700/90 text-white rounded-md shadow-xl flex items-center justify-center text-xs transition-colors backdrop-blur-sm border border-slate-700/50"
          title="Reset view"
        >
          ⊡
        </button>
      </div>

      {/* Mini stats overlay - more subtle */}
      <div className="absolute top-4 left-4 bg-slate-800/60 backdrop-blur-sm px-3 py-2 rounded-md shadow-lg text-xs text-slate-400 border border-slate-700/50">
        <div className="font-mono">{(scale * 100).toFixed(0)}%</div>
        {state.nodes.length > 0 && (
          <div className="font-mono text-[10px] mt-1 opacity-70">
            {services.length} nodes, {state.edges.length} edges
          </div>
        )}
      </div>

      {/* Welcome message (when no nodes) */}
      {state.nodes.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-slate-800/60 backdrop-blur-sm px-6 py-4 rounded-lg shadow-xl border border-slate-700/50">
            <div className="text-slate-300 text-lg font-semibold mb-2">
              Welcome to Azure Architecture Designer
            </div>
            <div className="text-slate-400 text-sm space-y-1">
              <div>🎨 Drag services from the left palette</div>
              <div>🤖 Or ask the AI assistant to generate an architecture</div>
              <div>🔗 Hover a node and drag the green port to connect</div>
              <div>⌨️ Press Tab to navigate, Ctrl+C/V to copy/paste</div>
            </div>
          </div>
        </div>
      )}

      {/* Connection drag hint */}
      {dragConnection && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-700/90 backdrop-blur-sm px-4 py-2 rounded-md shadow-lg text-sm text-white border border-emerald-500/50 pointer-events-none">
          {connectionTargetId ? '🔗 Release to connect' : 'Drag to a target node — Esc to cancel'}
        </div>
      )}

      {/* Alignment toolbar (shows when multiple nodes selected) */}
      {selectedNodeIds.size >= 2 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm px-3 py-2 rounded-md shadow-xl border border-slate-700/50 flex gap-2">
          <span className="text-xs text-slate-400 mr-2 self-center">{selectedNodeIds.size} selected</span>
          <button
            onClick={handleAlignLeft}
            className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
            title="Align Left"
          >
            ⫷
          </button>
          <button
            onClick={handleAlignCenter}
            className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
            title="Align Center"
          >
            ⫼
          </button>
          <button
            onClick={handleAlignRight}
            className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
            title="Align Right"
          >
            ⫸
          </button>
          <div className="w-px bg-slate-600 mx-1" />
          <button
            onClick={handleAlignTop}
            className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
            title="Align Top"
          >
            ⫴
          </button>
          <button
            onClick={handleAlignMiddle}
            className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
            title="Align Middle"
          >
            ⫾
          </button>
          <button
            onClick={handleAlignBottom}
            className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
            title="Align Bottom"
          >
            ⫵
          </button>
          {selectedNodeIds.size >= 3 && (
            <>
              <div className="w-px bg-slate-600 mx-1" />
              <button
                onClick={handleDistributeHorizontal}
                className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
                title="Distribute Horizontally"
              >
                ⇿
              </button>
              <button
                onClick={handleDistributeVertical}
                className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/90 text-white rounded text-xs transition-colors"
                title="Distribute Vertically"
              >
                ⇅
              </button>
            </>
          )}
        </div>
      )}

      {/* Minimap — click to navigate */}
      <div
        className="absolute bottom-6 left-6 w-48 h-32 bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 overflow-hidden cursor-crosshair"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const miniX = e.clientX - rect.left;
          const miniY = e.clientY - rect.top;
          const canvasX = (miniX / 192) * 4000;
          const canvasY = (miniY / 128) * 3000;
          setStagePos({
            x: dimensions.width / 2 - canvasX * scale,
            y: dimensions.height / 2 - canvasY * scale,
          });
        }}
      >
        <div className="relative w-full h-full">
          {/* Mini canvas representation */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #1a2332 0%, #0f1729 100%)',
            }}
          >
            {/* Show simplified node positions */}
            {services.map(service => {
              const pos = nodePositions.get(service.id) ?? servicePositions.get(service.id) ?? { x: 0, y: 0 };
              const miniX = (pos.x / 4000) * 192;
              const miniY = (pos.y / 3000) * 128;
              const dotColor = state.viewMode === 'cost-heatmap'
                ? heatFill(service.data.monthlyCost ?? 0)
                : CATEGORY_COLORS[service.data.category] ?? '#60a5fa';

              return (
                <div
                  key={service.id}
                  className="absolute w-1.5 h-1.5 rounded-sm"
                  style={{
                    left: `${miniX}px`,
                    top: `${miniY}px`,
                    background: dotColor,
                  }}
                />
              );
            })}
            {/* Viewport indicator */}
            <div
              className="absolute border border-yellow-400/50 pointer-events-none"
              style={{
                left: `${(-stagePos.x / scale / 4000) * 192}px`,
                top: `${(-stagePos.y / scale / 3000) * 128}px`,
                width: `${(dimensions.width / scale / 4000) * 192}px`,
                height: `${(dimensions.height / scale / 3000) * 128}px`,
              }}
            />
          </div>
        </div>
        <div className="absolute bottom-1 right-1 text-[8px] text-slate-500 pointer-events-none">
          Minimap
        </div>
      </div>

      {/* Connection Type Legend */}
      <div className="absolute bottom-6 left-56 bg-slate-800/85 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 px-3 py-2">
        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Connections</div>
        {[
          { color: '#34d399', dash: false, label: 'Private Endpoint',  badge: 'PE'   },
          { color: '#a78bfa', dash: true,  label: 'VNet Integration',  badge: 'VNet' },
          { color: '#fb923c', dash: true,  label: 'Service Endpoint',  badge: 'SE'   },
          { color: '#22d3ee', dash: true,  label: 'VNet Peering',      badge: 'Peer' },
          { color: '#94a3b8', dash: true,  label: 'Public',            badge: null   },
        ].map(({ color, dash, label, badge }) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <svg width="32" height="10" className="flex-shrink-0">
              <line
                x1="0" y1="5" x2="32" y2="5"
                stroke={color}
                strokeWidth="2"
                strokeDasharray={dash ? '5,3' : undefined}
              />
              <polygon points="26,2 32,5 26,8" fill={color} />
            </svg>
            {badge && (
              <span
                className="text-[8px] font-bold px-1 rounded leading-tight"
                style={{ background: color, color: '#fff' }}
              >
                {badge}
              </span>
            )}
            <span className="text-[10px] text-slate-300 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="absolute bg-slate-800/95 backdrop-blur-sm rounded-md shadow-2xl border border-slate-700/50 py-1 min-w-[140px] z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {contextMenu.nodeId && (
            <>
              <button
                onClick={() => handleContextMenuAction('copy')}
                className="w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
              >
                <span className="text-xs">📋</span>
                Copy
              </button>
              <button
                onClick={() => handleContextMenuAction('duplicate')}
                className="w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700/80 transition-colors flex items-center gap-2"
              >
                <span className="text-xs">📑</span>
                Duplicate
              </button>
              <div className="h-px bg-slate-700 my-1" />
              <button
                onClick={() => handleContextMenuAction('delete')}
                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-900/40 transition-colors flex items-center gap-2"
              >
                <span className="text-xs">🗑️</span>
                Delete
              </button>
            </>
          )}
          {contextMenu.edgeId && (
            <button
              onClick={() => handleContextMenuAction('delete')}
              className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-900/40 transition-colors flex items-center gap-2"
            >
              <span className="text-xs">🗑️</span>
              Delete Edge
            </button>
          )}
        </div>
      )}
    </div>
  );
}
