'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReferencingTestCase {
  id: string;
  name: string;
  status: string;
  stepName?: string;
}

interface ApiDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (force: boolean) => void;
  apiName?: string;
  referencingTestCases?: ReferencingTestCase[];
  totalReferences?: number;
}

export function ApiDeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  apiName,
  referencingTestCases = [],
  totalReferences = 0,
}: ApiDeleteConfirmDialogProps) {
  const t = useTranslations('apiRepository');
  const tCommon = useTranslations('common');

  const hasReferences = referencingTestCases.length > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'active':
        return 'bg-blue-500';
      case 'archived':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return t('statusDraft');
      case 'active':
        return t('statusActive');
      case 'archived':
        return t('statusArchived');
      default:
        return status;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasReferences && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {hasReferences ? t('apiInUseTitle') : t('confirmDeleteApi')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {hasReferences
                  ? t('apiInUseDescription', { 
                      apiName: apiName || 'API',
                      count: referencingTestCases.length 
                    })
                  : t('deleteApiWarning', { apiName: apiName || 'API' })}
              </p>

              {hasReferences && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
                        {t('apiReferencesWarning')}
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        {t('apiReferencesDetail', { 
                          count: referencingTestCases.length,
                          totalSteps: totalReferences 
                        })}
                      </p>
                    </div>
                  </div>

                  <ScrollArea className="h-[200px] mt-3">
                    <div className="space-y-2">
                      {referencingTestCases.map((testCase) => (
                        <div
                          key={testCase.id}
                          className="bg-white dark:bg-gray-900 border border-yellow-200 dark:border-yellow-800 rounded p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {testCase.name}
                                </p>
                                {testCase.stepName && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('stepName')}: {testCase.stepName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              className={`${getStatusColor(testCase.status)} text-white flex-shrink-0`}
                            >
                              {getStatusText(testCase.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-3">
                    {t('forceDeleteWarning')}
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          {hasReferences ? (
            <>
              <AlertDialogAction
                onClick={() => onConfirm(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('forceDelete')}
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction
              onClick={() => onConfirm(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}








