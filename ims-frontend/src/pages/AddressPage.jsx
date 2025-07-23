// src/pages/AddressPage.jsx

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
import AddressFormDialog from "@/components/dialogs/AddressFormDialog";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse w-1/4"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse w-1/4"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse w-1/4"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function AddressPage() {
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: addresses, isLoading, searchTerm, handleSearchChange, refreshData
    } = usePaginatedFetch("/addresses", 100); 
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [addressToDelete, setAddressToDelete] = useState(null);

    const handleEdit = (address) => {
        setEditingAddress(address);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingAddress(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (address) => {
        setAddressToDelete(address);
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;
        try {
            await axiosInstance.delete(`/addresses/${addressToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Address deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete address.");
        } finally {
            setAddressToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Addresses / Repair Centers</CardTitle>
                {canManage && <Button onClick={handleAddNew}>Add New Address</Button>}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by name, contact, or phone..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-left">Contact Person</th>
                                <th className="p-2 text-left">Phone</th>
                                <th className="p-2 text-left">Address</th>
                                {canManage && <th className="p-2 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                            ) : addresses.map((address) => (
                                <tr key={address.id} className="border-b">
                                    <td className="p-2 font-semibold">{address.name}</td>
                                    <td className="p-2">{address.contactPerson || '-'}</td>
                                    <td className="p-2">{address.phone || '-'}</td>
                                    <td className="p-2">{address.address || '-'}</td>
                                    {canManage && (
                                        <td className="p-2">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(address)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(address)}>
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
                <AddressFormDialog
                    isOpen={isDialogOpen}
                    setIsOpen={setIsDialogOpen}
                    address={editingAddress}
                    onSave={refreshData}
                />
            )}

            <AlertDialog open={!!addressToDelete} onOpenChange={(isOpen) => !isOpen && setAddressToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the address: <strong>{addressToDelete?.name}</strong>.
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