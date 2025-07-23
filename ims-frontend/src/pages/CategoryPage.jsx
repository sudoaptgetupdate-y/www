// src/pages/CategoryPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { Edit, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import CategoryFormDialog from "@/components/dialogs/CategoryFormDialog";
import { useTranslation } from "react-i18next";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function CategoryPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: categories, isLoading, searchTerm, handleSearchChange, refreshData
    } = usePaginatedFetch("/categories", 100); 
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const handleEdit = (category) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (category) => {
        setCategoryToDelete(category);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await axiosInstance.delete(`/categories/${categoryToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Category deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete category.");
        } finally {
            setCategoryToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>{t('categories')}</CardTitle>
                {canManage &&
                    <Button onClick={handleAddNew}>
                        Add New Category
                    </Button>
                }
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by category name..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">{t('tableHeader_name')}</th>
                                <th className="p-2 text-center">{t('tableHeader_requiresSn')}</th>
                                <th className="p-2 text-center">{t('tableHeader_requiresMac')}</th>
                                {canManage && <th className="p-2 text-center">{t('tableHeader_actions')}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
                            ) : categories.map((category) => (
                                <tr key={category.id} className="border-b">
                                    <td className="p-2 font-semibold">{category.name}</td>
                                    <td className="p-2 text-center">{category.requiresSerialNumber ? 'Yes' : 'No'}</td>
                                    <td className="p-2 text-center">{category.requiresMacAddress ? 'Yes' : 'No'}</td>
                                    {canManage && (
                                        <td className="p-2">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(category)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(category)}>
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

            {isDialogOpen && (
                <CategoryFormDialog
                    isOpen={isDialogOpen}
                    setIsOpen={setIsDialogOpen}
                    category={editingCategory}
                    onSave={refreshData}
                />
            )}

            <AlertDialog open={!!categoryToDelete} onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the category: <strong>{categoryToDelete?.name}</strong>.
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