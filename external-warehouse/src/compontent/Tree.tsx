import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
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
}

/**
 */
const CheckboxTreeSelect: React.FC<CheckboxTreeSelectProps> = ({
  treeData,
  mode,
  defaultValue,
  onChange,
  defaultExpandedItems = [],
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

        if (isNowSelected && !wasPreSelected) {
          allChildIds.forEach((childId) => {
            if (!finalSelectedIds.includes(childId)) {
              finalSelectedIds.push(childId);
            }
          });
        } else if (!isNowSelected && wasPreSelected) {
          finalSelectedIds = finalSelectedIds.filter((id) => !allChildIds.includes(id));
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

  return (
    <div className="checkbox-tree-select" style={{ width: '100%' }}>
        <SimpleTreeView
          checkboxSelection={mode === 'multiple'}
          multiSelect={mode === 'multiple'}
          selectedItems={selectedItems}
          onSelectedItemsChange={handleSelectedItemsChange}
          defaultExpandedItems={defaultExpandedItems}
        >
          {renderTreeNodes(treeData)}
        </SimpleTreeView>
    </div>
  );
};

export default CheckboxTreeSelect;