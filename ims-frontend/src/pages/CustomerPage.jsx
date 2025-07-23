// src/pages/CustomerPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { History, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
// --- START: แก้ไขการ import ---
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog";
// --- END ---
import { useNavigate } from "react-router-dom";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function CustomerPage() {
    const navigate = useNavigate();
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
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Customers</CardTitle>
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full sm:w-auto"
                    />
                     {canManage && <Button onClick={handleAddNew}>Add New Customer</Button>}
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Code</th>
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-left">Phone</th>
                                {canManage && <th className="p-2 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : customers.map((customer) => (
                                <tr key={customer.id} className="border-b">
                                    <td className="p-2 font-semibold">{customer.customerCode}</td>
                                    <td className="p-2">{customer.name}</td>
                                    <td className="p-2">{customer.phone}</td>
                                    {canManage && (
                                        <td className="p-2">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}/history`)}>
                                                    <History className="mr-2 h-4 w-4" /> History
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
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