import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Product, Customer } from '../types';

export const useDataLookups = () => {
    const { state } = useData();

    const productMap = useMemo(() => {
        const map = new Map<string, Product>();
        state.products.forEach(p => map.set(p.id, p));
        return map;
    }, [state.products]);

    const customerMap = useMemo(() => {
        const map = new Map<string, Customer>();
        state.customers.forEach(c => map.set(c.id, c));
        return map;
    }, [state.customers]);

    // Helper to get product quickly
    const getProduct = (id: string) => productMap.get(id);
    const getCustomer = (id: string) => customerMap.get(id);

    return {
        productMap,
        customerMap,
        getProduct,
        getCustomer
    };
};
