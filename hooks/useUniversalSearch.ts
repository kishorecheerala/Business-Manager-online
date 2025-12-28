import { useState, useEffect } from 'react';
import { Customer, Supplier, Product, Sale, Purchase, AppState } from '../types';

interface SearchResults {
    customers: Customer[];
    suppliers: Supplier[];
    products: Product[];
    sales: Sale[];
    purchases: Purchase[];
}

export const useUniversalSearch = (state: AppState) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResults>({ customers: [], suppliers: [], products: [], sales: [], purchases: [] });

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm.length < 2) {
                setResults({ customers: [], suppliers: [], products: [], sales: [], purchases: [] });
                return;
            }

            const term = searchTerm.toLowerCase();

            const customers = state.customers.filter(c =>
                c.name.toLowerCase().includes(term) ||
                c.phone.includes(term) ||
                c.address.toLowerCase().includes(term) ||
                c.area.toLowerCase().includes(term) ||
                c.id.toLowerCase().includes(term)
            );

            const suppliers = state.suppliers.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.phone.includes(term) ||
                s.location.toLowerCase().includes(term) ||
                s.id.toLowerCase().includes(term)
            );

            const products = state.products.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.id.toLowerCase().includes(term)
            );

            const sales = state.sales.filter(s =>
                s.id.toLowerCase().includes(term)
            );

            const purchases = state.purchases.filter(p =>
                p.id.toLowerCase().includes(term) ||
                p.supplierInvoiceId?.toLowerCase().includes(term)
            );

            setResults({ customers, suppliers, products, sales, purchases });

        }, 250); // Debounce search

        return () => clearTimeout(handler);
    }, [searchTerm, state]);

    return { searchTerm, setSearchTerm, results };
};
