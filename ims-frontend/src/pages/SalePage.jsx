// src/pages/SalePage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-5 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2">
            <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
        </td>
    </tr>
);


export default function SalePage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    const { 
        data: sales, 
        pagination, 
        isLoading, 
        searchTerm,
        filters,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        handleFilterChange,
        refreshData 
    } = usePaginatedFetch("/sales", 10, { status: "All" });
    
    const [saleToVoid, setSaleToVoid] = useState(null);

    const getStatusVariant = (status) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'VOIDED': return 'destructive';
            default: return 'secondary';
        }
    };

    const handleVoidSale = async () => {
        if (!saleToVoid) return;
        try {
            await axiosInstance.patch(`/sales/${saleToVoid.id}/void`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Sale record has been voided!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to void sale record.");
        } finally {
            setSaleToVoid(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sale Records</CardTitle>
                {canManage && (
                    <Button onClick={() => navigate('/sales/new')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Sale
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by Customer or Seller Name..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by Status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="VOIDED">Voided</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <colgroup>
                            <col className="w-[25%]" />
                            <col className="w-[25%]" />
                            <col className="w-[120px]" />
                            <col className="w-[80px]" />
                            <col className="w-[15%]" />
                            <col className="w-[180px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Customer</th>
                                <th className="p-2 text-left">Sale Date</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-center">Items</th>
                                <th className="p-2 text-right">Total (inc. VAT)</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : sales.map((sale) => (
                                <tr key={sale.id} className="border-b">
                                    <td className="p-2 text-left">{sale.customer.name}</td>
                                    <td className="p-2 text-left">{new Date(sale.saleDate).toLocaleString()}</td>
                                    <td className="p-2 text-center">
                                        <Badge variant={getStatusVariant(sale.status)} className="w-24 justify-center">
                                            {sale.status}
                                        </Badge>
                                    </td>
                                    <td className="p-2 text-center">{sale.itemsSold.length}</td>
                                    <td className="p-2 text-right">{sale.total.toLocaleString('en-US')} THB</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
                                                Details
                                            </Button>
                                            {isSuperAdmin && (
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    disabled={sale.status !== 'COMPLETED'}
                                                    onClick={() => setSaleToVoid(sale)}
                                                >
                                                    Void
                                                </Button>
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
            <AlertDialog open={!!saleToVoid} onOpenChange={() => setSaleToVoid(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to void this sale?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will void sale record (ID: {saleToVoid?.id}) and return all sold items to stock. This is irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoidSale}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}