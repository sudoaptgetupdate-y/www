// src/pages/AddressPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { Edit, Trash2, PlusCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import AddressFormDialog from "@/components/dialogs/AddressFormDialog";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Label } from "@/components/ui/label"; // --- เพิ่มบรรทัดนี้ ---
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // --- เพิ่มบรรทัดนี้ ---

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-1/2"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-full"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function AddressPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: addresses, isLoading, searchTerm, handleSearchChange, refreshData, pagination, handlePageChange, handleItemsPerPageChange
    } = usePaginatedFetch("/addresses", 10);
    
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
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{t('addressBook')} / Repair Centers</CardTitle>
                        <CardDescription>Manage addresses for sending and receiving repair items.</CardDescription>
                    </div>
                     {canManage && 
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
                        </Button>
                    }
                </div>
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('tableHeader_name')}</TableHead>
                            <TableHead>{t('tableHeader_contactPerson')}</TableHead>
                            <TableHead>{t('tableHeader_phone')}</TableHead>
                            <TableHead>{t('tableHeader_address')}</TableHead>
                            {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                        ) : addresses.map((address) => (
                            <TableRow key={address.id}>
                                <TableCell>{address.name}</TableCell>
                                <TableCell>{address.contactPerson || '-'}</TableCell>
                                <TableCell>{address.phone || '-'}</TableCell>
                                <TableCell>{address.address || '-'}</TableCell>
                                {canManage && (
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(address)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </Button>
                                            <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(address)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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