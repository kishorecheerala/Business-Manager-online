
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';
import Card from './Card';

interface QRScannerModalProps {
    onClose: () => void;
    onScanned: (decodedText: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScanned }) => {
    const [scanStatus, setScanStatus] = useState<string>("Initializing camera...");
    const scannerId = "qr-reader-modal";
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        // Ensure DOM element exists before initializing
        const element = document.getElementById(scannerId);
        if (!element) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;
        
        setScanStatus("Requesting camera permissions...");

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                html5QrCode.pause(true);
                onScanned(decodedText);
            }, 
            (errorMessage) => {
                // ignore frame parse errors
            }
        ).then(() => setScanStatus("Scanning for QR Code..."))
        .catch(err => {
            setScanStatus(`Camera Permission Error. Please allow camera access.`);
            console.error("Camera start failed.", err);
        });

        return () => {
            if (html5QrCode.isScanning) {
                html5QrCode.stop().then(() => html5QrCode.clear()).catch(err => console.error("Failed to stop scanner", err));
            } else {
                html5QrCode.clear();
            }
        };
    }, [onScanned]);

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
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
            <Card title="Scan QR Code" className="relative z-10 w-full max-w-md animate-scale-in">
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <X size={20}/>
                 </button>
                <div id={scannerId} className="w-full mt-4 rounded-lg overflow-hidden border bg-black min-h-[300px]"></div>
                <p className="text-center text-sm my-2 text-gray-600 dark:text-gray-400">{scanStatus}</p>
            </Card>
        </div>
    );
};

export default QRScannerModal;
