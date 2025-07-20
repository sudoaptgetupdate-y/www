// src/pages/CustomerPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2">
            <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
        </td>
    </tr>
);

export default function CustomerPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const { 
        data: customers, pagination, isLoading, searchTerm,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, refreshData 
    } = usePaginatedFetch("/customers");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const handleAdd = () => {
        setIsEditMode(false);
        setSelectedCustomer(null);
        setIsFormOpen(true);
    };

    const handleEdit = (customer) => {
        setIsEditMode(true);
        setSelectedCustomer(customer);
        setIsFormOpen(true);
    };

    const handleDelete = (customer) => {
        setCustomerToDelete(customer);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await axiosInstance.delete(`/customers/${customerToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Customer deleted successfully.");
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
                <div>
                    <CardTitle>Customer Management</CardTitle>
                    <CardDescription>Manage your customer list.</CardDescription>
                </div>
                 {canManage && (
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <Input
                    placeholder="Search by name, code, or phone..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="mb-4"
                />
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[25%]" />
                            <col className="w-[15%]" />
                            <col className="w-[30%]" />
                            <col className="w-[240px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Code</th>
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-left">Phone</th>
                                <th className="p-2 text-left">Address</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : customers.length > 0 ? (
                                customers.map((customer) => (
                                    <tr key={customer.id} className="border-b">
                                        <td className="p-2">{customer.customerCode}</td>
                                        <td className="p-2">{customer.name}</td>
                                        <td className="p-2">{customer.phone || '-'}</td>
                                        <td className="p-2 truncate">{customer.address || '-'}</td>
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => navigate(`/customers/${customer.id}/history`)}>History</Button>
                                                {canManage && (
                                                    <>
                                                        <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(customer)}>Edit</Button>
                                                        <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(customer)}>Delete</Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-4 text-center">No customers found.</td></tr>
                            )}
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

            <CustomerFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                customer={selectedCustomer}
                isEditMode={isEditMode}
                onSuccess={refreshData}
            />
            <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the customer account for <strong>{customerToDelete?.name}</strong>. This action cannot be undone and might affect sales records.
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