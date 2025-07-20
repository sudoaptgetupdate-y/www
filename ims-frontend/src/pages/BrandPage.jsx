// src/pages/BrandPage.jsx

import { useState } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle } from "lucide-react";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2">
            <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
        </td>
    </tr>
);

export default function BrandPage() {
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    
    const { 
        data: brands, 
        pagination, 
        isLoading, 
        searchTerm,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        refreshData 
    } = usePaginatedFetch("/brands");

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [brandToDelete, setBrandToDelete] = useState(null);


    const handleAddBrand = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post("/brands", { name: newBrandName }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Brand created successfully!");
            refreshData();
            setIsAddDialogOpen(false);
            setNewBrandName("");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create brand.");
        }
    };

    const handleEditBrand = async (e) => {
        e.preventDefault();
        if (!editingBrand) return;
        try {
            await axiosInstance.put(`/brands/${editingBrand.id}`, { name: editingBrand.name }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Brand updated successfully!");
            refreshData();
            setIsEditDialogOpen(false);
            setEditingBrand(null);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update brand.");
        }
    };

    const confirmDelete = async () => {
        if (!brandToDelete) return;
        try {
            await axiosInstance.delete(`/brands/${brandToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Brand deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete brand.");
        } finally {
            setBrandToDelete(null);
        }
    };

    const openEditDialog = (brand) => {
        setEditingBrand({ ...brand });
        setIsEditDialogOpen(true);
    };
    
    const openDeleteDialog = (brand) => {
        setBrandToDelete(brand);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Brand Management</CardTitle>
                {canManage && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Brand
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Brand</DialogTitle></DialogHeader>
                            <form onSubmit={handleAddBrand}>
                                <div className="grid gap-4 py-4">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} required />
                                </div>
                                <DialogFooter><Button type="submit">Save Brand</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input placeholder="Search for a brand..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Name</th>
                                {canManage && <th className="p-2 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : brands.map((brand) => (
                                <tr key={brand.id} className="border-b">
                                    <td className="p-2">{brand.name}</td>
                                    {canManage && (
                                        <td className="p-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => openEditDialog(brand)}>Edit</Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => openDeleteDialog(brand)}>Delete</Button>
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

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Brand</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditBrand}>
                        <div className="grid gap-4 py-4">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input id="edit-name" value={editingBrand?.name || ''} onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })} required />
                        </div>
                        <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!brandToDelete} onOpenChange={() => setBrandToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the <strong>{brandToDelete?.name}</strong> brand. This action cannot be undone.
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