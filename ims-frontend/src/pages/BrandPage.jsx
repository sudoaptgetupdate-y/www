// src/pages/BrandPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { Edit, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function BrandPage() {
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: brands, pagination, isLoading, refreshData
    } = usePaginatedFetch("/brands", 100); 
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ name: '' });
    const [editingBrandId, setEditingBrandId] = useState(null);
    const [brandToDelete, setBrandToDelete] = useState(null);

    const handleEdit = (brand) => {
        setIsEditMode(true);
        setEditingBrandId(brand.id);
        setFormData({ name: brand.name });
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setIsEditMode(false);
        setFormData({ name: '' });
        setIsDialogOpen(true);
    };

    const handleDelete = (brand) => {
        setBrandToDelete(brand);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/brands/${editingBrandId}` : "/brands";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Brand ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save brand.`);
        }
    };

    const confirmDelete = async () => {
        if (!brandToDelete) return;
        try {
            await axiosInstance.delete(`/brands/${brandToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Brand deleted successfully!");
            refreshData();
        // --- START: แก้ไขบรรทัดนี้ ---
        } catch (error) {
        // --- END ---
            toast.error(error.response?.data?.error || "Failed to delete brand.");
        } finally {
            setBrandToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Brands</CardTitle>
                {canManage && <Button onClick={handleAddNew}>Add New Brand</Button>}
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Name</th>
                                {canManage && <th className="p-2 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
                            ) : brands.map((brand) => (
                                <tr key={brand.id} className="border-b">
                                    <td className="p-2 font-semibold">{brand.name}</td>
                                    {canManage && (
                                        <td className="p-2">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(brand)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(brand)}>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Brand</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Brand Name</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ name: e.target.value })} required />
                        </div>
                        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!brandToDelete} onOpenChange={(isOpen) => !isOpen && setBrandToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the brand: <strong>{brandToDelete?.name}</strong>.
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