'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubfamilyTree } from '../api/use-families';
import { SubfamilyDialog } from './subfamily-dialog';
import { SubfamilyTreeNode } from './subfamily-tree-node';
import type { Family } from '@ethos/shared';

interface FamilyCardProps {
  family: Family;
  canManage: boolean;
  onEdit: (family: Family) => void;
  onDelete: (family: Family) => void;
}

export function FamilyCard({ family, canManage, onEdit, onDelete }: FamilyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);

  const { data: tree, isLoading } = useSubfamilyTree(
    expanded ? family._id : undefined,
  );

  return (
    <div className="border rounded-lg bg-card">
      {/* Family header */}
      <div className="flex items-center justify-between p-4">
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <span className="font-medium">{family.name}</span>
            {family.description && (
              <p className="text-sm text-muted-foreground">{family.description}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant={family.isActive ? 'success' : 'secondary'}>
            {family.isActive ? 'Activa' : 'Inactiva'}
          </Badge>
          {canManage && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(family)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(family)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Subfamilies tree */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-2">Cargando subfamilias...</p>
          ) : (
            <>
              {tree && tree.length > 0 ? (
                <div className="space-y-1">
                  {tree.map((node) => (
                    <SubfamilyTreeNode
                      key={node._id}
                      node={node}
                      familyId={family._id}
                      canManage={canManage}
                      depth={0}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No hay subfamilias todavía
                </p>
              )}

              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSubDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar subfamilia
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Create root-level subfamily */}
      <SubfamilyDialog
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        familyId={family._id}
        parentId={null}
      />
    </div>
  );
}
