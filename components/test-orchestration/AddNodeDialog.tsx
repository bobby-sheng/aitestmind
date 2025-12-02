"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NodeType } from '@/types/test-case';
import { Network, Clock, CheckCircle, Flag } from 'lucide-react';

interface AddNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNodeType: (type: NodeType) => void;
}

const nodeTypeOptions = [
  {
    type: 'api' as NodeType,
    label: 'API节点',
    description: '调用一个API接口',
    icon: Network,
    color: 'text-blue-500',
  },
  {
    type: 'wait' as NodeType,
    label: '等待节点',
    description: '等待指定时间或条件',
    icon: Clock,
    color: 'text-yellow-500',
  },
  {
    type: 'assertion' as NodeType,
    label: '断言节点',
    description: '验证测试结果',
    icon: CheckCircle,
    color: 'text-green-500',
  },
  {
    type: 'end' as NodeType,
    label: '完成节点',
    description: '测试流程结束',
    icon: Flag,
    color: 'text-green-600',
  },
];

export default function AddNodeDialog({
  open,
  onOpenChange,
  onSelectNodeType,
}: AddNodeDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = nodeTypeOptions.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (type: NodeType) => {
    onSelectNodeType(type);
    onOpenChange(false);
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加节点</DialogTitle>
          <DialogDescription>选择要添加的节点类型</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="搜索节点类型..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="space-y-2">
            {filteredOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.type}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleSelect(option.type)}
                >
                  <div className="flex items-start gap-3 text-left">
                    <Icon className={`h-5 w-5 mt-0.5 ${option.color}`} />
                    <div className="flex-1">
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

