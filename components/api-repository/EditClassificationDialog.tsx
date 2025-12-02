'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface TreeNode {
  type: 'platform' | 'component' | 'feature';
  name: string;
  count: number;
  fullPath: {
    platform?: string;
    component?: string;
    feature?: string;
  };
}

interface EditClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: TreeNode | null;
  onSuccess: () => void;
}

export function EditClassificationDialog({
  open,
  onOpenChange,
  node,
  onSuccess,
}: EditClassificationDialogProps) {
  const t = useTranslations('apiRepository.editClassification');
  
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (node) {
      setNewName(node.name);
    }
  }, [node]);

  const handleSubmit = async () => {
    if (!newName.trim() || !node) return;
    if (newName === node.name) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/api-library/update-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: node.fullPath,
          newName: newName.trim(),
          level: node.type,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(result.error || t('updateFailed'));
      }
    } catch (error: any) {
      alert(t('updateFailed') + ': ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewName('');
    onOpenChange(false);
  };

  if (!node) return null;

  const categoryType = 
    node.type === 'platform' ? t('platform') : 
    node.type === 'component' ? t('component') : 
    t('feature');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { type: categoryType })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('currentName')}</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              {node.name}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newName">{t('newName')}</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('newNamePlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {t('affectedApis', { count: node.count })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newName.trim() || newName === node.name || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

