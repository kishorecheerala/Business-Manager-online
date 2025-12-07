
import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children, confirmText, cancelText, confirmVariant = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div 
        style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}
        className="p-4"
    >
      <div className="absolute inset-0 bg-black/50 animate-fade-in-fast" onClick={onClose} />
      <Card title={title} className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{children}</p>
          <div className="flex justify-end gap-4 pt-4">
            <Button onClick={onClose} variant="secondary">
              {cancelText || 'Cancel'}
            </Button>
            <Button onClick={onConfirm} variant={confirmVariant}>
              {confirmText || 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmationModal;
