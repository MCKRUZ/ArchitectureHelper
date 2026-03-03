/**
 * Logical Tree Utility Hook
 *
 * Builds a tree structure from nodes based on logicalParent relationships.
 * This is separate from React Flow's visual parentId - it represents
 * business logic hierarchy for WAF review, cost rollup, and compliance checks.
 */

import { useMemo } from 'react';
import type { AzureNode } from './types';

export interface LogicalTree {
  /** Map of parent ID to array of child IDs */
  children: Map<string, string[]>;
  /** Map of child ID to parent ID (inverse lookup) */
  parents: Map<string, string>;
  /** Root nodes (nodes with no logical parent) */
  roots: string[];
}

/**
 * Build a logical tree from nodes based on logicalParent field
 */
export function useLogicalTree(nodes: AzureNode[]): LogicalTree {
  return useMemo(() => {
    const children = new Map<string, string[]>();
    const parents = new Map<string, string>();
    const roots: string[] = [];

    // Build parent-child relationships
    for (const node of nodes) {
      const logicalParent = node.data.logicalParent;

      if (logicalParent) {
        // This node has a logical parent
        parents.set(node.id, logicalParent);

        // Add to parent's children list
        if (!children.has(logicalParent)) {
          children.set(logicalParent, []);
        }
        children.get(logicalParent)!.push(node.id);
      } else {
        // This is a root node
        roots.push(node.id);
      }
    }

    return { children, parents, roots };
  }, [nodes]);
}

/**
 * Get all descendants of a node (recursive)
 */
export function getDescendants(
  nodeId: string,
  tree: LogicalTree
): string[] {
  const result: string[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const childIds = tree.children.get(current) || [];

    for (const childId of childIds) {
      result.push(childId);
      queue.push(childId);
    }
  }

  return result;
}

/**
 * Get all ancestors of a node (recursive, bottom-up)
 */
export function getAncestors(
  nodeId: string,
  tree: LogicalTree
): string[] {
  const result: string[] = [];
  let current = tree.parents.get(nodeId);

  while (current) {
    result.push(current);
    current = tree.parents.get(current);
  }

  return result;
}

/**
 * Get the depth of a node in the tree (0 = root)
 */
export function getDepth(
  nodeId: string,
  tree: LogicalTree
): number {
  return getAncestors(nodeId, tree).length;
}

/**
 * Check if nodeA is an ancestor of nodeB
 */
export function isAncestorOf(
  ancestorId: string,
  descendantId: string,
  tree: LogicalTree
): boolean {
  const ancestors = getAncestors(descendantId, tree);
  return ancestors.includes(ancestorId);
}

/**
 * Get immediate children of a node
 */
export function getChildren(
  nodeId: string,
  tree: LogicalTree
): string[] {
  return tree.children.get(nodeId) || [];
}

/**
 * Get parent of a node
 */
export function getParent(
  nodeId: string,
  tree: LogicalTree
): string | undefined {
  return tree.parents.get(nodeId);
}
