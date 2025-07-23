// src/pages/ProductModelPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, Edit, Trash2, ArrowUpDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { useTranslation } from "react-i18next";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort, className = "" }) => (
    <th className={`p-2 cursor-pointer hover:bg-slate-50 ${className}`} onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </th>
);

const initialFormData = {
    modelNumber: "",
    description: "",
    sellingPrice: "",
    categoryId: "",
    brandId: "",
};

export default function ProductModelPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: productModels, pagination, isLoading, searchTerm, filters,
        sortBy, sortOrder, handleSortChange,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, handleFilterChange, refreshData
    } = usePaginatedFetch("/product-models", 10, { categoryId: "All", brandId: "All" });
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingModelId, setEditingModelId] = useState(null);
    const [modelToDelete, setModelToDelete] = useState(null);

    const openDialog = (model = null) => {
        if (model) {
            setIsEditMode(true);
            setEditingModelId(model.id);
            setFormData({
                modelNumber: model.modelNumber,
                description: model.description || "",
                sellingPrice: model.sellingPrice.toString(),
                categoryId: model.categoryId,
                brandId: model.brandId
            });
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
        }
        setIsDialogOpen(true);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleComboboxSelect = (type, value) => {
        setFormData(prev => ({ ...prev, [type]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.categoryId || !formData.brandId) {
            toast.error("Please select both a Category and a Brand.");
            return;
        }

        const url = isEditMode ? `/product-models/${editingModelId}` : "/product-models";
        const method = isEditMode ? 'put' : 'post';
        const payload = {
            ...formData,
            sellingPrice: parseFloat(formData.sellingPrice),
            categoryId: parseInt(formData.categoryId, 10),
            brandId: parseInt(formData.brandId, 10),
        };

        try {
            await axiosInstance[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Product Model ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save product model.`);
        }
    };

    const confirmDelete = async () => {
        if (!modelToDelete) return;
        try {
            await axiosInstance.delete(`/product-models/${modelToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Product Model deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete product model.");
        } finally {
            setModelToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Product {t('models')}</CardTitle>
                {canManage &&
                    <Button onClick={() => openDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Product Model
                    </Button>
                }
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <Input
                        placeholder="Search by Model Number..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="lg:col-span-1"
                    />
                    <CategoryCombobox
                        selectedValue={filters.categoryId}
                        onSelect={(value) => handleFilterChange('categoryId', value)}
                    />
                    <BrandCombobox
                        selectedValue={filters.brandId}
                        onSelect={(value) => handleFilterChange('brandId', value)}
                    />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <SortableHeader sortKey="modelNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_productModel')}
                                </SortableHeader>
                                <SortableHeader sortKey="category" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_category')}
                                </SortableHeader>
                                <SortableHeader sortKey="brand" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_brand')}
                                </SortableHeader>
                                <SortableHeader sortKey="sellingPrice" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange} className="text-left">
                                    {t('tableHeader_price')}
                                </SortableHeader>
                                {canManage && <th className="p-2 text-center">{t('tableHeader_actions')}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : productModels.map((model) => (
                                <tr key={model.id} className="border-b">
                                    <td className="p-2 font-semibold">{model.modelNumber}</td>
                                    <td className="p-2">{model.category.name}</td>
                                    <td className="p-2">{model.brand.name}</td>
                                    <td className="p-2">{model.sellingPrice.toFixed(2)}</td>
                                    {canManage && (
                                        <td className="p-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => openDialog(model)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => setModelToDelete(model)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} items)
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>Next</Button>
                </div>
            </CardFooter>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Product Model</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="modelNumber">Model Number</Label>
                            <Input id="modelNumber" value={formData.modelNumber} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" value={formData.description} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sellingPrice">Selling Price</Label>
                            <Input id="sellingPrice" type="number" step="0.01" value={formData.sellingPrice} onChange={handleInputChange} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <CategoryCombobox
                                    selectedValue={formData.categoryId}
                                    onSelect={(value) => handleComboboxSelect('categoryId', value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <BrandCombobox
                                    selectedValue={formData.brandId}
                                    onSelect={(value) => handleComboboxSelect('brandId', value)}
                                />
                            </div>
                        </div>
                        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!modelToDelete} onOpenChange={(isOpen) => !isOpen && setModelToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the product model: <strong>{modelToDelete?.modelNumber}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}