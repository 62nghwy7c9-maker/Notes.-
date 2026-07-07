import type { FolderTreeNode } from '@notes/shared';

export interface FlatFolder {
  id: string;
  label: string; // eingerückter Name für Auswahl-Listen
  path: string; // "Projekte/Garten"
}

/** Baum → flache, eingerückte Liste (für „Verschieben nach…"-Auswahl). */
export function flattenTree(tree: FolderTreeNode[], depth = 0, prefix = ''): FlatFolder[] {
  const out: FlatFolder[] = [];
  for (const node of tree) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    out.push({
      id: node.id,
      label: `${' '.repeat(depth * 3)}${node.icon ?? '📁'} ${node.name}`,
      path,
    });
    out.push(...flattenTree(node.children, depth + 1, path));
  }
  return out;
}

/** Pfad eines Ordners im Baum, z. B. für den Editor-Breadcrumb. */
export function findPath(tree: FolderTreeNode[], id: string): string | null {
  for (const node of tree) {
    if (node.id === id) return node.name;
    const sub = findPath(node.children, id);
    if (sub !== null) return `${node.name}/${sub}`;
  }
  return null;
}
