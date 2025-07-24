// src/pages/CustomerPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { History, Edit, Trash2, UserPlus } from "lucide-react"; // --- เพิ่ม UserPlus ---
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"; // --- Import Table Components ---

const SkeletonRow = () => (
    // --- แก้ไข SkeletonRow ---
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function CustomerPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: customers, pagination, isLoading, searchTerm, handleSearchChange, 
        handlePageChange, handleItemsPerPageChange, refreshData
    } = usePaginatedFetch("/customers", 10);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingCustomer(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (customer) => {
        setCustomerToDelete(customer);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await axiosInstance.delete(`/customers/${customerToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Customer deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete customer.");
        } finally {
            setCustomerToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{t('customers')}</CardTitle>
                        <CardDescription>Manage all customer information and history.</CardDescription>
                    </div>
                    {canManage && 
                        <Button onClick={handleAddNew}>
                            <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
                        </Button>
                    }
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('tableHeader_code')}</TableHead>
                            <TableHead>{t('tableHeader_name')}</TableHead>
                            <TableHead>{t('tableHeader_phone')}</TableHead>
                            {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                        ) : customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>{customer.customerCode}</TableCell>
                                <TableCell>{customer.name}</TableCell>
                                <TableCell>{customer.phone}</TableCell>
                                {canManage && (
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}/history`)}>
                                                <History className="mr-2 h-4 w-4" /> History
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
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
                <CustomerFormDialog
                    isOpen={isDialogOpen}
                    setIsOpen={setIsDialogOpen}
                    customer={editingCustomer}
                    onSave={refreshData}
                />
            )}

            <AlertDialog open={!!customerToDelete} onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete customer: <strong>{customerToDelete?.name}</strong>.
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