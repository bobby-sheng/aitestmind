'use client';

import { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  Archive 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  _count?: {
    apis: number;
  };
}

interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}

export function CategoryTree({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryTreeProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const t = useTranslations('apiRepository.categoryTree');

  return (
    <div className="h-full flex flex-col border-r bg-muted/10">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{t('title')}</h3>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onCreateCategory}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* 特殊分类 */}
        <div className="space-y-1">
          <button
            onClick={() => onSelectCategory(undefined)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
              !selectedCategoryId
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <span>{t('allApis')}</span>
            </div>
          </button>

          <button
            onClick={() => onSelectCategory('starred')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
              selectedCategoryId === 'starred'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>{t('starred')}</span>
            </div>
          </button>

          <button
            onClick={() => onSelectCategory('archived')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
              selectedCategoryId === 'archived'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span>{t('archived')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 分类列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className={cn(
                "group relative flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                selectedCategoryId === category.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onMouseEnter={() => setHoveredId(category.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectCategory(category.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {selectedCategoryId === category.id ? (
                  <FolderOpen className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="truncate">{category.name}</span>
                {category._count && category._count.apis > 0 && (
                  <Badge 
                    variant={selectedCategoryId === category.id ? "secondary" : "outline"}
                    className="ml-auto"
                  >
                    {category._count.apis}
                  </Badge>
                )}
              </div>

              {/* 操作按钮 */}
              {hoveredId === category.id && (
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCategory(category);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory(category);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}














