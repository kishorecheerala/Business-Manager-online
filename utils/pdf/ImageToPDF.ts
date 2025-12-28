import jsPDF from 'jspdf';
import { getImageType } from './helpers';

export const generateImagesToPDF = (images: string[], fileName: string) => {
    // A4 size by default, adjust if needed
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 5; // Reduced margin for max image visibility

    images.forEach((imgData, index) => {
        if (index > 0) doc.addPage();

        try {
            const imgProps = doc.getImageProperties(imgData);
            const imgRatio = imgProps.width / imgProps.height;
            const pageRatio = (pageWidth - margin * 2) / (pageHeight - margin * 2);

            let finalWidth, finalHeight;

            // Fit image within page margins while maintaining aspect ratio
            if (imgRatio > pageRatio) {
                finalWidth = pageWidth - margin * 2;
                finalHeight = finalWidth / imgRatio;
            } else {
                finalHeight = pageHeight - margin * 2;
                finalWidth = finalHeight * imgRatio;
            }

            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            const format = getImageType(imgData);
            doc.addImage(imgData, format, x, y, finalWidth, finalHeight, undefined, 'FAST'); // Use FAST compression for speed/compatibility
        } catch (e) {
            console.error("Error adding image to PDF", e);
            doc.setFontSize(12);
            doc.text(`Error loading image #${index + 1}`, 10, 10);
        }
    });

    return doc;
};
