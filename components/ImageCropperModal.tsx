
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import Card from './Card';
import Button from './Button';

interface ImageCropperModalProps {
    isOpen: boolean;
    imageSrc: string | null;
    onClose: () => void;
    onCrop: (croppedImage: string) => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, imageSrc, onClose, onCrop }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset when image changes
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, imageSrc]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    const handleSave = () => {
        if (!imageRef.current || !containerRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Output size (Square)
        const size = 500; 
        canvas.width = size;
        canvas.height = size;

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        const viewportRect = containerRef.current.getBoundingClientRect();
        const img = imageRef.current;
        
        // Ratio: output pixels per screen pixel
        const ratio = size / viewportRect.width; 

        ctx.save();
        // Move context origin to center
        ctx.translate(size / 2, size / 2);
        // Apply user scale
        ctx.scale(scale, scale);
        // Apply user translation (scaled to output size)
        ctx.translate(position.x * ratio, position.y * ratio);
        
        // Draw image centered at origin
        // We use the natural dimensions of the image, but we must account for how it's rendered on screen.
        // On screen, the image is unstyled (intrinsic size) BUT scaled by CSS transform? 
        // No, ideally we draw it based on natural size.
        // If the image is huge on screen, `scale` might need adjustment if we want 1.0 to mean "fit".
        // But for simplicity: The visual transform is directly mapped to canvas transform.
        
        // However, `drawImage` draws using source image pixels.
        // To match visual "1:1 pixel mapping", we draw it centered.
        
        // Logic: The user sees the image transformed by T(x,y) * S(scale).
        // We replicated T and S on the canvas context.
        // Now we just draw the image centered at (0,0).
        ctx.drawImage(
            img, 
            -img.naturalWidth / 2, 
            -img.naturalHeight / 2
        );
        
        ctx.restore();

        onCrop(canvas.toDataURL('image/jpeg', 0.85));
    };
    
    // Initial auto-fit logic
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const containerSize = 256; // Size of our viewport in pixels
        
        // Calculate scale to "cover" the viewport initially
        const minScale = Math.max(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
        setScale(minScale);
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[600] flex items-center justify-center p-4 animate-fade-in-fast">
            <Card className="w-full max-w-md p-0 overflow-hidden flex flex-col h-auto shadow-2xl bg-white dark:bg-slate-800">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Adjust Product Image</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><X size={24}/></button>
                </div>
                
                <div className="relative bg-gray-900 flex items-center justify-center touch-none select-none overflow-hidden" 
                     style={{ height: '350px' }}
                     onPointerDown={handlePointerDown}
                     onPointerMove={handlePointerMove}
                     onPointerUp={handlePointerUp}
                     onPointerLeave={handlePointerUp}
                >
                    {/* Mask Overlay (Darkened areas outside crop) */}
                    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-lg box-content"></div>
                    </div>
                    
                    {/* Guide Text */}
                    <div className="absolute top-4 left-0 right-0 text-center z-20 pointer-events-none">
                        <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs">Drag to Pan • Zoom to Fit</span>
                    </div>

                    {/* Image Layer */}
                    <div style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'center center',
                        // Use flex centering from parent to align origin
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 0, height: 0 // Virtual center point
                    }}>
                        <img 
                            ref={imageRef}
                            src={imageSrc}
                            alt="Crop Target"
                            draggable={false}
                            onLoad={handleImageLoad}
                            style={{
                                // Ensure image centers itself on the virtual point
                                transform: 'translate(-50%, -50%)', 
                                position: 'absolute',
                                left: '50%',
                                top: '50%'
                            }}
                        />
                    </div>
                </div>

                <div className="p-5 bg-white dark:bg-slate-800 space-y-6">
                    <div className="flex items-center gap-4">
                        <ZoomOut size={20} className="text-gray-400"/>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="3" 
                            step="0.05" 
                            value={scale} 
                            onChange={e => setScale(parseFloat(e.target.value))}
                            className="flex-grow h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <ZoomIn size={20} className="text-gray-400"/>
                    </div>
                    
                    <div className="flex gap-3">
                        <Button onClick={onClose} variant="secondary" className="flex-1 py-3">Cancel</Button>
                        <Button onClick={handleSave} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                            <Check size={18} className="mr-2"/> Save Image
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default ImageCropperModal;
