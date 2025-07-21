// src/pages/AddressPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import AddressFormDialog from "@/components/dialogs/AddressFormDialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import axiosInstance from "@/api/axiosInstance";

const SkeletonRow = () => (
    <tr className="border-b">
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

export default function AddressPage() {
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const { 
        data: addresses, pagination, isLoading, searchTerm,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, refreshData 
    } = usePaginatedFetch("/addresses");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState(null);

    const handleAdd = () => {
        setIsEditMode(false);
        setSelectedAddress(null);
        setIsFormOpen(true);
    };

    const handleEdit = (address) => {
        setIsEditMode(true);
        setSelectedAddress(address);
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;
        try {
            await axiosInstance.delete(`/addresses/${addressToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Address deleted successfully.");
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
                <div>
                    <CardTitle>Address Book</CardTitle>
                    <CardDescription>Manage repair centers, warehouses, and other locations.</CardDescription>
                </div>
                 {canManage && (
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Address
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <Input
                    placeholder="Search by name, contact, or phone..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="mb-4"
                />
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Location Name</th>
                                <th className="p-2 text-left">Contact Person</th>
                                <th className="p-2 text-left">Phone</th>
                                <th className="p-2 text-left">Address</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : addresses.map((address) => (
                                <tr key={address.id} className="border-b">
                                    <td className="p-2">{address.name}</td>
                                    <td className="p-2">{address.contactPerson || '-'}</td>
                                    <td className="p-2">{address.phone || '-'}</td>
                                    <td className="p-2 truncate">{address.address || '-'}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {canManage && (
                                                <>
                                                    <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(address)}>Edit</Button>
                                                    <Button variant="destructive" size="sm" className="w-20" onClick={() => setAddressToDelete(address)}>Delete</Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
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

            <AddressFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                address={selectedAddress}
                isEditMode={isEditMode}
                onSuccess={refreshData}
            />
            <AlertDialog open={!!addressToDelete} onOpenChange={() => setAddressToDelete(null)}>
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