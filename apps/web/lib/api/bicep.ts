import type { DiagramState, AzureNode, AzureEdge } from '@/lib/state/types';
import { api } from './client';

/** Matches backend DiagramExportDto shape. */
export interface DiagramExportDto {
  diagramName: string;
  nodes: ExportNodeDto[];
  edges: ExportEdgeDto[];
  region: string | null;
}

export interface ExportNodeDto {
  id: string;
  serviceType: string;
  displayName: string;
  sku: string | null;
  region: string | null;
  description: string | null;
  logicalParent: string | null;
  groupType: string | null;
  subtitle: string | null;
  properties: Record<string, unknown> | null;
}

export interface ExportEdgeDto {
  id: string;
  source: string;
  target: string;
  connectionType: string | null;
}

/** Bicep preview result from the backend. */
export interface BicepPreviewResult {
  files: BicepFile[];
}

export interface BicepFile {
  path: string;
  content: string;
}

function serializeNode(node: AzureNode): ExportNodeDto {
  return {
    id: node.id,
    serviceType: node.data.serviceType,
    displayName: node.data.displayName,
    sku: node.data.sku ?? null,
    region: node.data.region ?? null,
    description: node.data.description ?? null,
    logicalParent: node.data.logicalParent ?? null,
    groupType: node.data.groupType ?? null,
    subtitle: node.data.subtitle ?? null,
    properties: Object.keys(node.data.properties).length > 0
      ? node.data.properties
      : null,
  };
}

function serializeEdge(edge: AzureEdge): ExportEdgeDto {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    connectionType: edge.data?.connectionType ?? null,
  };
}

/** Serialize frontend DiagramState to the backend export DTO shape. */
export function serializeDiagramForExport(state: DiagramState): DiagramExportDto {
  const firstNodeRegion = state.nodes.find(n => n.data.region)?.data.region;

  return {
    diagramName: state.diagramName,
    nodes: state.nodes.map(serializeNode),
    edges: state.edges.map(serializeEdge),
    region: firstNodeRegion ?? null,
  };
}

/** Request a Bicep preview (JSON with file contents). */
export async function fetchBicepPreview(
  state: DiagramState,
): Promise<BicepPreviewResult> {
  const dto = serializeDiagramForExport(state);
  return api.post<BicepPreviewResult>('/bicep/generate?format=preview', dto);
}

/** Download a Bicep zip file. */
export async function downloadBicepZip(state: DiagramState): Promise<void> {
  const dto = serializeDiagramForExport(state);
  const blob = await api.postBlob('/bicep/generate?format=zip', dto);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.diagramName.replace(/\s+/g, '-').toLowerCase()}-bicep.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
