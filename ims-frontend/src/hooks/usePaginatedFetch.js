// src/hooks/usePaginatedFetch.js

import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "@/api/axiosInstance";

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

export function usePaginatedFetch(apiPath, initialItemsPerPage = 10, defaultFilters = {}) {
    const token = useAuthStore((state) => state.token);
    const location = useLocation();
    const navigate = useNavigate();

    // ฟังก์ชันนี้จะคำนวณค่า filter เริ่มต้นที่ถูกต้องเสมอ
    const getInitialFilters = useCallback(() => {
        const locationState = location.state || {};
        // ถ้ามี state จาก location ให้ใช้ค่านั้นเป็นหลัก ถ้าไม่มีให้ใช้ค่า default
        return locationState.status ? { ...defaultFilters, status: locationState.status } : defaultFilters;
    }, [location.state, JSON.stringify(defaultFilters)]);

    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: initialItemsPerPage
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState(getInitialFilters());
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [sortBy, setSortBy] = useState('updatedAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // useEffect นี้จะคอย "Sync" state ภายใน (filters)
    // ให้ตรงกับ props หรือ location state ที่อาจมีการเปลี่ยนแปลง
    useEffect(() => {
        setFilters(getInitialFilters());
        setPagination(p => ({ ...p, currentPage: 1 }));
    }, [location.state, getInitialFilters]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
                search: debouncedSearchTerm,
                ...filters,
                sortBy,
                sortOrder,
            };
            
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
    }, [token, apiPath, pagination.currentPage, pagination.itemsPerPage, debouncedSearchTerm, JSON.stringify(filters), sortBy, sortOrder]);

    useEffect(() => {
        fetchData();
    }, [fetchData]); // Dependency array ที่ถูกต้องคือ fetchData

    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
        setSortOrder(prevOrder => (sortBy === newSortBy && prevOrder === 'asc' ? 'desc' : 'asc'));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

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
        if (location.state?.status) {
            navigate(location.pathname, { replace: true, state: {} });
        }
        setFilters(prev => ({ ...prev, [filterName]: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    return {
        data,
        pagination,
        isLoading,
        searchTerm,
        filters,
        sortBy,
        sortOrder,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange,
        handleSortChange,
        refreshData: fetchData
    };
}