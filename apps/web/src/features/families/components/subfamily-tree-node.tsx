'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubfamilyDialog } from './subfamily-dialog';
import { useDeleteSubfamily } from '../api/use-families';
import type { SubfamilyTree } from '@ethos/shared';

interface SubfamilyTreeNodeProps {
  node: SubfamilyTree;
  familyId: string;
  canManage: boolean;
  depth: number;
}

export function SubfamilyTreeNode({
  node,
  familyId,
  canManage,
  depth,
}: SubfamilyTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const deleteMutation = useDeleteSubfamily();

  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between rounded-md bg-background px-3 py-2 hover:bg-muted/50 transition-colors"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand toggle */}
          <button
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
            onClick={() => setExpanded(!expanded)}
          >
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 block flex-shrink-0" style={{ width: 6, height: 6 }} />
            )}
          </button>

          <div className="min-w-0">
            <span className="text-sm font-medium">{node.name}</span>
            {node.description && (
              <p className="text-xs text-muted-foreground truncate">
                {node.description}
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Add child */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Agregar sub-nivel"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            {/* Edit */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => deleteMutation.mutate(node._id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Children (recursive) */}
      {expanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <SubfamilyTreeNode
              key={child._id}
              node={child}
              familyId={familyId}
              canManage={canManage}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Create child dialog */}
      <SubfamilyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        familyId={familyId}
        parentId={node._id}
        parentName={node.name}
      />

      {/* Edit dialog */}
      <SubfamilyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        familyId={familyId}
        parentId={node.parentId}
        subfamily={node}
      />
    </div>
  );
}
