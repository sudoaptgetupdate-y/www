// src/pages/ProductModelPage.jsx

import { useEffect, useState } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle } from "lucide-react";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2">
            <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
        </td>
    </tr>
);

const initialFormData = {
    modelNumber: "",
    description: "",
    sellingPrice: "",
    categoryId: "",
    brandId: "",
};

export default function ProductModelPage() {
    const { 
        data: productModels, 
        pagination, 
        isLoading, 
        searchTerm,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        refreshData 
    } = usePaginatedFetch("/product-models");
    
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingModelId, setEditingModelId] = useState(null);
    const [modelToDelete, setModelToDelete] = useState(null);
    const [initialBrandForEdit, setInitialBrandForEdit] = useState(null);
    const [initialCategoryForEdit, setInitialCategoryForEdit] = useState(null);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: id === 'sellingPrice' ? parseFloat(value) || 0 : value });
    };

    const handleSelectChange = (id, value) => {
        setFormData({ ...formData, [id]: parseInt(value) });
    };

    const openDialog = (model = null) => {
        if (model) {
            setIsEditMode(true);
            setEditingModelId(model.id);
            setFormData({
                modelNumber: model.modelNumber,
                description: model.description || "",
                sellingPrice: model.sellingPrice,
                categoryId: String(model.categoryId),
                brandId: String(model.brandId),
            });
            setInitialBrandForEdit(model.brand);
            setInitialCategoryForEdit(model.category);
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
            setInitialBrandForEdit(null);
            setInitialCategoryForEdit(null);
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode
            ? `/product-models/${editingModelId}`
            : "/product-models";
        const method = isEditMode ? 'put' : 'post';
        
        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Product model ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} product model.`);
        }
    };

    const confirmDelete = async () => {
        if(!modelToDelete) return;
        try {
            await axiosInstance.delete(`/product-models/${modelToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Product model deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete product model.");
        } finally {
            setModelToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Model Management</CardTitle>
                {canManage && 
                    <Button onClick={() => openDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Product Model
                    </Button>
                }
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input placeholder="Search by model or description..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Model Number</th>
                                <th className="p-2 text-left">Description</th>
                                <th className="p-2 text-right">Price</th>
                                <th className="p-2 text-left">Category</th>
                                <th className="p-2 text-left">Brand</th>
                                {canManage && <th className="p-2 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : productModels.map((model) => (
                                <tr key={model.id} className="border-b">
                                    <td className="p-2">{model.modelNumber}</td>
                                    <td className="p-2 max-w-xs truncate">{model.description}</td>
                                    <td className="p-2 text-right">{model.sellingPrice.toLocaleString()}</td>
                                    <td className="p-2">{model.category.name}</td>
                                    <td className="p-2">{model.brand.name}</td>
                                    {canManage && (
                                         <td className="p-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => openDialog(model)}>Edit</Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => setModelToDelete(model)}>Delete</Button>
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
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">Rows per page:</Label>
                    <Select value={String(pagination.itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
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
                    <DialogHeader><DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Product Model</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="modelNumber">Model Number</Label>
                                <Input id="modelNumber" value={formData.modelNumber} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input id="description" value={formData.description} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="sellingPrice">Selling Price (Pre-VAT)</Label>
                                <Input id="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="brandId">Brand</Label>
                                <BrandCombobox
                                    selectedValue={formData.brandId}
                                    onSelect={(value) => handleSelectChange('brandId', value)}
                                    initialBrand={initialBrandForEdit}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="categoryId">Category</Label>
                                <CategoryCombobox
                                    selectedValue={formData.categoryId}
                                    onSelect={(value) => handleSelectChange('categoryId', value)}
                                    initialCategory={initialCategoryForEdit}
                                />
                            </div>
                        </div>
                        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!modelToDelete} onOpenChange={() => setModelToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the model: <strong>{modelToDelete?.modelNumber}</strong>.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}