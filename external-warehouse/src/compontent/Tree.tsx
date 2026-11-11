import React, { useState, useEffect } from 'react';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { useTranslate } from 'react-admin';

export interface TreeSelectNode {
  itemId: string;
  label: string;
  children?: TreeSelectNode[]
}

interface CheckboxTreeSelectProps {
  treeData: TreeSelectNode[];
  mode: 'single' | 'multiple';
  defaultValue?: string | string[];
  onChange: (value: string | string[] | null) => void;
  defaultExpandedItems?: string[];
  showToolbar?: boolean;
  checkStrictly?: boolean;
  onCheckStrictlyChange?: (strictly: boolean) => void;
}

/**
 * チェックボックス付きツリー選択コンポーネント
 */
const CheckboxTreeSelect: React.FC<CheckboxTreeSelectProps> = ({
  treeData,
  mode,
  defaultValue,
  onChange,
  defaultExpandedItems = [],
  showToolbar = false,
  checkStrictly = false,
  onCheckStrictlyChange,
}) => {
  const translate = useTranslate();

  const [selectedItems, setSelectedItems] = useState<string[]>(() => {
    if (defaultValue) {
      if (mode === 'single') {
        return typeof defaultValue === 'string' ? [defaultValue] : [];
      } else {
        return Array.isArray(defaultValue) ? defaultValue : [];
      }
    }
    return [];
  });

  // 展開状態を管理する
  const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpandedItems);

  useEffect(() => {
    if (!defaultValue) {
      setSelectedItems([]);
      onChange(mode === 'single' ? null : []);
      return;
    }
    const newSelected = mode === 'single'
      ? (typeof defaultValue === 'string' ? [defaultValue] : [])
      : (Array.isArray(defaultValue) ? defaultValue : []);
    setSelectedItems(newSelected);
  }, [defaultValue, mode]);

  // ツリー内のすべてのノードIDを取得する
  const getAllNodeIds = (nodes: TreeSelectNode[]): string[] => {
    let ids: string[] = [];
    nodes.forEach((node) => {
      ids.push(node.itemId);
      ids = ids.concat(getAllNodeIds(node.children || []));
    });
    return ids;
  };

  const renderTreeNodes = (nodes: TreeSelectNode[]) => {
    return nodes.map((node) => {
      if (node.children && node.children.length > 0) {
        return (
          <TreeItem
            key={node.itemId}
            itemId={node.itemId}
            label={translate(node.label, { _: node.label })}
          >
            {renderTreeNodes(node.children)}
          </TreeItem>
        );
      }
      return (
        <TreeItem
          key={node.itemId}
          itemId={node.itemId}
          label={translate(node.label, { _: node.label })}
        />
      );
    });
  };

  const getAllChildNodeIds = (node: TreeSelectNode): string[] => {
    let childIds: string[] = [];
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        childIds.push(child.itemId);
        childIds = [...childIds, ...getAllChildNodeIds(child)];
      });
    }
    return childIds;
  };

  const handleSelectedItemsChange = (
    _event: React.SyntheticEvent<Element, Event> | null,
    itemIds: string | string[] | null
  ) => {
    const currentOperateIds: string[] = itemIds
      ? (Array.isArray(itemIds) ? itemIds : [itemIds])
      : [];

    const prevSelectedIds = [...selectedItems];
    let finalSelectedIds = [...currentOperateIds];

    const traverseAndHandleSelect = (nodes: TreeSelectNode[]) => {
      if (mode === 'single') return;

      nodes.forEach((node) => {
        const nodeId = node.itemId;
        const allChildIds = getAllChildNodeIds(node);
        const isNowSelected = finalSelectedIds.includes(nodeId);
        const wasPreSelected = prevSelectedIds.includes(nodeId);

        // 父子連動が有効な場合のみ子ノードの選択状態を連動させる
        if (!checkStrictly) {
          if (isNowSelected && !wasPreSelected) {
            allChildIds.forEach((childId) => {
              if (!finalSelectedIds.includes(childId)) {
                finalSelectedIds.push(childId);
              }
            });
          } else if (!isNowSelected && wasPreSelected) {
            finalSelectedIds = finalSelectedIds.filter((id) => !allChildIds.includes(id));
          }
        }

        if (node.children && node.children.length > 0) {
          traverseAndHandleSelect(node.children);
        }
      });
    };

    traverseAndHandleSelect(treeData);

    if (mode === 'single') {
      finalSelectedIds = finalSelectedIds.slice(-1);
    }

    finalSelectedIds = finalSelectedIds.filter((id, index, self) => {
      return self.indexOf(id) === index;
    });

    setSelectedItems(finalSelectedIds);

    const outputValue = mode === 'single'
      ? (finalSelectedIds[0] || null)
      : (finalSelectedIds.length > 0 ? finalSelectedIds : []);
    onChange(outputValue);
  };

  // 全選択・全解除
  const handleSelectAll = (checked: boolean) => {
    if (mode === 'single') return;
    const allIds = checked ? getAllNodeIds(treeData) : [];
    setSelectedItems(allIds);
    onChange(allIds);
  };

  // 展開・折りたたみ
  const handleExpandAll = (checked: boolean) => {
    setExpandedItems(checked ? getAllNodeIds(treeData) : []);
  };

  return (
    <div className="checkbox-tree-select" style={{ width: '100%' }}>
      {showToolbar && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={expandedItems.length > 0}
                onChange={(e) => handleExpandAll(e.target.checked)}
              />
            }
            label="展開/折りたたみ"
          />
          {mode === 'multiple' && (
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={treeData.length > 0 && getAllNodeIds(treeData).every((id) => selectedItems.includes(id))}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              }
              label="全選択/全解除"
            />
          )}
          {mode === 'multiple' && (
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!checkStrictly}
                  onChange={(e) => onCheckStrictlyChange && onCheckStrictlyChange(!e.target.checked)}
                />
              }
              label="父子連動"
            />
          )}
        </Box>
      )}
      <SimpleTreeView
        checkboxSelection={mode === 'multiple'}
        multiSelect={mode === 'multiple'}
        selectedItems={selectedItems}
        onSelectedItemsChange={handleSelectedItemsChange}
        expandedItems={expandedItems}
        onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
      >
        {renderTreeNodes(treeData)}
      </SimpleTreeView>
    </div>
  );
};

export default CheckboxTreeSelect;
