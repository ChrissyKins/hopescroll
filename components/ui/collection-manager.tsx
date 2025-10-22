'use client';

import { useState } from 'react';
import { Button } from './button';
import { useToast } from './toast';
import { useConfirmDialog } from './confirm-dialog';
import { CollectionIcon, PlusIcon, EditIcon, TrashIcon } from './icons';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CollectionManagerProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  onCollectionsChange: () => void;
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

export function CollectionManager({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCollectionsChange,
}: CollectionManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0],
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }

      toast.success('Collection created');
      setIsCreating(false);
      setFormData({ name: '', description: '', color: DEFAULT_COLORS[0] });
      onCollectionsChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create collection');
    }
  };

  const handleUpdate = async (collectionId: string) => {
    if (!formData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update collection');
      }

      toast.success('Collection updated');
      setEditingId(null);
      setFormData({ name: '', description: '', color: DEFAULT_COLORS[0] });
      onCollectionsChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update collection');
    }
  };

  const handleDelete = async (collection: Collection) => {
    const confirmed = await confirm({
      title: `Delete "${collection.name}"?`,
      message: collection.itemCount > 0
        ? `This collection has ${collection.itemCount} item${collection.itemCount === 1 ? '' : 's'}. Items will not be deleted, just uncategorized.`
        : 'This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete collection');
      }

      toast.success('Collection deleted');
      if (selectedCollectionId === collection.id) {
        onSelectCollection(null);
      }
      onCollectionsChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete collection');
    }
  };

  const startEdit = (collection: Collection) => {
    setEditingId(collection.id);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color || DEFAULT_COLORS[0],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', color: DEFAULT_COLORS[0] });
  };

  return (
    <div className="space-y-2">
      {/* All Items */}
      <button
        onClick={() => onSelectCollection(null)}
        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
          selectedCollectionId === null
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CollectionIcon className="w-5 h-5" />
            <span className="font-medium">All Items</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {collections.reduce((sum, c) => sum + c.itemCount, 0)}
          </span>
        </div>
      </button>

      {/* Collections List */}
      {collections.map((collection) => (
        <div key={collection.id}>
          {editingId === collection.id ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Collection name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                autoFocus
              />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-6 h-6 rounded-full border-2 ${
                      formData.color === color
                        ? 'border-gray-900 dark:border-white'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUpdate(collection.id)}
                >
                  Save
                </Button>
                <Button variant="neutral" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onSelectCollection(collection.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors group ${
                selectedCollectionId === collection.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: collection.color || '#3B82F6' }}
                  />
                  <span className="font-medium truncate">{collection.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {collection.itemCount}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(collection);
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(collection);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {collection.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-5 truncate">
                  {collection.description}
                </p>
              )}
            </button>
          )}
        </div>
      ))}

      {/* Create New Collection */}
      {isCreating ? (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Collection name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            autoFocus
          />
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
          <div className="flex gap-2 flex-wrap">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setFormData({ ...formData, color })}
                className={`w-6 h-6 rounded-full border-2 ${
                  formData.color === color
                    ? 'border-gray-900 dark:border-white'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Create
            </Button>
            <Button variant="neutral" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <Button
            variant="neutral"
            size="sm"
            onClick={() => setIsCreating(true)}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>
      )}
    </div>
  );
}
