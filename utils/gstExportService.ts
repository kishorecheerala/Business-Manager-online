import { Sale, Customer, SaleItem } from '../types';
import { formatDate } from './formatUtils';

interface GSTRow {
    gstin: string; // GSTIN of Customer (Empty for B2C)
    receiverName: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValue: number;
    placeOfSupply: string; // "36-Telangana" etc. (Default local for now)
    reverseCharge: string; // "N"
    invoiceType: string; // "Regular"
    ecommerceGSTIN: string; // Empty
    rate: number;
    taxableValue: number;
    cessAmount: number;
}

export const GSTExportService = {
    /**
     * Categorizes sales into B2B (Registered) and B2C (Unregistered)
     */
    categorizeSales: (sales: Sale[], customers: Customer[]) => {
        const b2b: Sale[] = [];
        const b2c: Sale[] = [];

        sales.forEach(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            if (customer && customer.reference && customer.reference.length >= 15) { // Basic check for GSTIN in reference or a new field
                b2b.push(sale);
            } else {
                b2c.push(sale);
            }
        });
        return { b2b, b2c };
    },

    /**
     * Prepares data for GSTR-1 B2B CSV
     */
    generateB2BCSV: (sales: Sale[], customers: Customer[]) => {
        const rows: GSTRow[] = [];

        sales.forEach(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const gstin = customer?.reference || ''; // Assuming reference is GSTIN

            // We need to group items by Tax Rate for GSTR1
            const itemsByRate = new Map<number, number>(); // Rate -> TaxableValue

            sale.items.forEach(item => {
                const roughTaxable = (item.price * item.quantity);
                const rate = sale.gstAmount > 0 ? 18 : 0; // FALLBACK
                const taxable = itemsByRate.get(rate) || 0;
                itemsByRate.set(rate, taxable + roughTaxable);
            });

            // GSTR-1 prefers DD-MM-YYYY usually
            const invoiceDate = formatDate(sale.date).replace(/ /g, '-'); // "14-Dec-2025" - Valid for some, but typically DD-MM-YYYY is strictly 01-12-2025
            // Let's make sure we output DD-MM-YYYY for Government tools
            const d = new Date(sale.date);
            const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

            itemsByRate.forEach((taxableVal, rate) => {
                rows.push({
                    gstin,
                    receiverName: customer?.name || 'Unknown',
                    invoiceNumber: sale.id,
                    invoiceDate: dateStr, // Override specific format for GSTR1
                    invoiceValue: sale.totalAmount, // Grand Total
                    placeOfSupply: '36-Telangana', // Default
                    reverseCharge: 'N',
                    invoiceType: 'Regular',
                    ecommerceGSTIN: '',
                    rate: rate,
                    taxableValue: taxableVal,
                    cessAmount: 0
                });
            });
        });

        // Convert to CSV String
        const header = "GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice date,Invoice Value,Place Of Supply,Reverse Charge,Invoice Type,E-Commerce GSTIN,Rate,Taxable Value,Cess Amount";
        const body = rows.map(r =>
            `${r.gstin},"${r.receiverName}",${r.invoiceNumber},${r.invoiceDate},${r.invoiceValue},"${r.placeOfSupply}",${r.reverseCharge},${r.invoiceType},${r.ecommerceGSTIN},${r.rate},${r.taxableValue.toFixed(2)},${r.cessAmount}`
        ).join('\n');

        return `${header}\n${body}`;
    },

    /**
     * Prepares data for GSTR-1 B2B CSV (Small)
     * For now, let's just make a generic "Sales Register" that is useful for auditors
     */
    generateSalesRegisterCSV: (sales: Sale[], customers: Customer[]) => {
        const header = "Invoice Date,Invoice No,Customer Name,Customer GSTIN,Taxable Value,IGST,CGST,SGST,Total Tax,Total Value";

        const body = sales.map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const gstin = customer?.reference || '';
            const date = formatDate(sale.date); // Standard format "14 Dec 2025" is fine for humans

            // Logic: Taxable = Total - GST
            const taxable = sale.totalAmount - sale.gstAmount;

            // Logic: Split Tax
            // If local (default): CGST = GST/2, SGST = GST/2
            const cgst = sale.gstAmount / 2;
            const sgst = sale.gstAmount / 2;
            const igst = 0;

            return `"${date}",${sale.id},"${customer?.name || 'Cash Sale'}",${gstin},${taxable.toFixed(2)},${igst.toFixed(2)},${cgst.toFixed(2)},${sgst.toFixed(2)},${sale.gstAmount.toFixed(2)},${sale.totalAmount.toFixed(2)}`;
        }).join('\n');

        return `${header}\n${body}`;
    }
};
