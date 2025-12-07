
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Edit, Save, X, Package, IndianRupee, Percent, PackageCheck, Barcode, Printer, Filter, Grid, List, Camera, Image as ImageIcon, Eye, Trash2, QrCode, Boxes, Maximize2, Minimize2, ArrowLeft, CheckSquare, Square, Plus, Clock, AlertTriangle, Share2, MoreHorizontal, LayoutGrid, Check, Wand2, Loader2, Sparkles, MessageCircle, CheckCircle, Copy, Share, GripVertical, GripHorizontal, FileSpreadsheet, TrendingUp, Scale, Settings, History } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, PurchaseItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import BarcodeModal from '../components/BarcodeModal';
import BatchBarcodeModal from '../components/BatchBarcodeModal';
import { compressImage } from '../utils/imageUtils'; 
import { Html5Qrcode } from 'html5-qrcode';
import EmptyState from '../components/EmptyState';
import { useDialog } from '../context/DialogContext';
import ImageCropperModal from '../components/ImageCropperModal';
import { GoogleGenAI } from "@google/genai";
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import ProductHistoryModal from '../components/ProductHistoryModal';

interface ProductsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

// Helper to convert base64 to File object for sharing
const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
