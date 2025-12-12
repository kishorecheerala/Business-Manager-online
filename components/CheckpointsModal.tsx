import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2, Clock, CheckCircle } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { useAppContext } from '../context/AppContext';
import { useDialog } from '../context/DialogContext';
import * as db from '../utils/db';
import { Snapshot } from '../types';

interface CheckpointsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CheckpointsModal: React.FC<CheckpointsModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useAppContext();
  const { showConfirm } = useDialog();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen]);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const snaps = await db.getSnapshots();
      setSnapshots(snaps);
    } catch (e) {
      console.error("Failed to load snapshots", e);
      showToast("Error loading checkpoints", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snap: Snapshot) => {
    const confirmed = await showConfirm(`Are you sure you want to restore "${snap.name}"? Current data will be replaced.`, {
      title: "Restore Checkpoint",
      confirmText: "Restore Data",
      variant: "danger"
    });

    if (confirmed) {
      try {
        await db.restoreSnapshot(snap.id);
        window.location.reload();
      } catch (e) {
        console.error(e);
        showToast("Failed to restore checkpoint.", 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm("Delete this checkpoint permanently?")) {
      await db.deleteSnapshot(id);
      setSnapshots(prev => prev.filter(s => s.id !== id));
      showToast("Checkpoint deleted.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4 animate-fade-in-fast">
      <Card className="w-full max-w-md animate-scale-in flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Clock size={24} /> Checkpoints
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-1">
          {loading ? (
            <p className="text-center text-gray-500 py-4">Loading...</p>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>No checkpoints found.</p>
              <p className="text-xs mt-1">Create one from the Dashboard.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map(snap => (
                <div key={snap.id} className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{snap.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {new Date(snap.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => handleRestore(snap)} variant="secondary" className="h-8 px-2 text-xs" title="Restore">
                      <RotateCcw size={14} className="mr-1" /> Restore
                    </Button>
                    <Button onClick={() => handleDelete(snap.id)} variant="secondary" className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 border-red-100" title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t dark:border-slate-700 shrink-0">
          <Button onClick={onClose} variant="secondary" className="w-full">Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default CheckpointsModal;