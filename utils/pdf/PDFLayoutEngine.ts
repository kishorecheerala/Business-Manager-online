import jsPDF from 'jspdf';
import { InvoiceTemplateConfig } from '../../types';
import { getImageType } from './helpers';

export class PDFLayoutEngine {
    doc: jsPDF;
    cursorY: number;
    margin: number;
    pageWidth: number;
    pageHeight: number;
    config: InvoiceTemplateConfig;
    spacingScale: number;

    constructor(doc: jsPDF, config: InvoiceTemplateConfig) {
        this.doc = doc;
        this.config = config;
        this.margin = config.layout.margin || 10;
        this.pageWidth = doc.internal.pageSize.getWidth();
        this.pageHeight = doc.internal.pageSize.getHeight();
        this.cursorY = this.margin;
        this.spacingScale = config.layout.spacing ?? 1.0;

        // Apply background if exists
        this.applyBackground();
    }

    applyBackground() {
        if (this.config.layout.backgroundImage) {
            try {
                this.doc.addImage(
                    this.config.layout.backgroundImage,
                    getImageType(this.config.layout.backgroundImage),
                    0, 0, this.pageWidth, this.pageHeight
                );
            } catch (e) { }
        }
    }

    checkPageBreak(neededHeight: number) {
        if (this.cursorY + neededHeight > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.applyBackground();
            this.cursorY = this.margin;
            return true;
        }
        return false;
    }

    addY(amount: number) {
        this.cursorY += amount * this.spacingScale;
    }

    // Advanced Text Rendering with Page Break Check
    addText(text: string | string[], x: number, options: {
        align?: 'left' | 'center' | 'right',
        fontSize?: number,
        font?: string,
        fontStyle?: 'normal' | 'bold' | 'italic',
        color?: string
    } = {}) {
        const { align = 'left', fontSize, font, fontStyle, color } = options;

        if (fontSize) this.doc.setFontSize(fontSize);
        if (font) this.doc.setFont(font, fontStyle || 'normal');
        if (color) this.doc.setTextColor(color);
        else this.doc.setTextColor(this.config.colors.text);

        // Calculate height
        const lineHeight = (this.doc.getLineHeight() / this.doc.internal.scaleFactor);
        const textArray = Array.isArray(text) ? text : [text];
        const totalHeight = textArray.length * lineHeight;

        this.checkPageBreak(totalHeight);

        this.doc.text(text, x, this.cursorY + lineHeight - 2, { align }); // Adjust baseline
        this.addY((totalHeight + 1)); // Small padding
    }

    // Split text to fit width
    splitText(text: string, maxWidth: number) {
        return this.doc.splitTextToSize(text, maxWidth);
    }

    currentY() {
        return this.cursorY;
    }

    setY(y: number) {
        this.cursorY = y;
    }
}
