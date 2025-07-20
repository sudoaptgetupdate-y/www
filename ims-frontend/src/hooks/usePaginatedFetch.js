// src/hooks/usePaginatedFetch.js

import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import axiosInstance from "@/api/axiosInstance"; // --- 1. Import axiosInstance ---

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// --- 2. แก้ไข apiUrl ให้รับแค่ส่วนท้าย (path) ---
export function usePaginatedFetch(apiPath, initialItemsPerPage = 10, initialFilters = {}) {
    const token = useAuthStore((state) => state.token);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: initialItemsPerPage
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState(initialFilters);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const location = useLocation();

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
                search: debouncedSearchTerm,
                ...filters,
            };
            
            // --- 3. เปลี่ยนไปใช้ axiosInstance และ apiPath ---
            const response = await axiosInstance.get(apiPath, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            setData(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error(`Failed to fetch data from ${apiPath}`);
        } finally {
            setIsLoading(false);
        }
    }, [token, apiPath, pagination.currentPage, pagination.itemsPerPage, debouncedSearchTerm, JSON.stringify(filters)]);

    useEffect(() => {
        fetchData();
    }, [fetchData, location.key]);

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };
    
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, currentPage: newPage }));
    };

    const handleItemsPerPageChange = (newSize) => {
        setPagination({
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: parseInt(newSize, 10)
        });
    };
    
    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    return {
        data,
        pagination,
        isLoading,
        searchTerm,
        filters,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange,
        refreshData: fetchData
    };
}