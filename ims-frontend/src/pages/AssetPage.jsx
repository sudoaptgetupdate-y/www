// src/pages/AssetPage.jsx

import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, MoreHorizontal, History, Edit, ArrowRightLeft, Archive } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function AssetPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: assets,
        pagination,
        isLoading,
        searchTerm,
        filters,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange,
        refreshData
    } = usePaginatedFetch("/assets", 10, { status: "All" }); // <-- แก้ไข Endpoint

    const getStatusVariant = (status) => {
        switch (status) {
            case 'IN_WAREHOUSE': return 'success';
            case 'ASSIGNED': return 'warning';
            case 'DECOMMISSIONED': return 'secondary';
            case 'DEFECTIVE': return 'destructive';
            default: return 'outline';
        }
    };

    const handleDecommission = async (assetId) => {
        try {
            await axiosInstance.patch(`/assets/${assetId}/decommission`, {}, { // <-- แก้ไข Endpoint
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Asset has been decommissioned.");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to decommission asset.");
        }
    };

    const handleReinstate = async (assetId) => {
        try {
            await axiosInstance.patch(`/assets/${assetId}/reinstate`, {}, { // <-- แก้ไข Endpoint
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Asset has been reinstated to the warehouse.");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to reinstate asset.");
        }
    };
    
    const handleAssignItem = (assetToAssign) => {
        navigate('/asset-assignments/new', { state: { initialItems: [assetToAssign] } });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Company Assets (Master List)</CardTitle>
                        <CardDescription>A complete list of all company-owned assets.</CardDescription>
                    </div>
                    {canManage &&
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => navigate('/assets/new')}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Asset
                            </Button>
                            <Button onClick={() => navigate('/asset-assignments/new')}>
                               <ArrowRightLeft className="mr-2 h-4 w-4" /> Assign
                            </Button>
                        </div>
                    }
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by Asset Code, S/N, Model..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="Filter by Status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="IN_WAREHOUSE">In Warehouse</SelectItem>
                            <SelectItem value="ASSIGNED">Assigned</SelectItem>
                            <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                            <SelectItem value="DEFECTIVE">Defective</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[25%]" />
                            <col className="w-[20%]" />
                            <col className="w-[140px]" />
                            <col className="w-[20%]" />
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2">Asset Code</th>
                                <th className="p-2">Product Model</th>
                                <th className="p-2">Serial Number</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2">Assigned To</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : assets.map((asset) => (
                                <tr key={asset.id} className="border-b">
                                    <td className="p-2 font-semibold">{asset.assetCode}</td>
                                    <td className="p-2">{asset.productModel.modelNumber}</td>
                                    <td className="p-2">{asset.serialNumber || 'N/A'}</td>
                                    <td className="p-2 text-center">
                                        <Badge variant={getStatusVariant(asset.status)} className="w-28 justify-center">
                                            {asset.status}
                                        </Badge>
                                    </td>
                                    <td className="p-2">{asset.assignedTo?.name || '-'}</td>
                                    <td className="p-2 text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}/history`)}>
                                                    <History className="mr-2 h-4 w-4" /> View History
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => navigate(`/assets/edit/${asset.id}`)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Asset
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleAssignItem(asset)}
                                                    disabled={asset.status !== 'IN_WAREHOUSE'}
                                                >
                                                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Assign this asset
                                                </DropdownMenuItem>

                                                {asset.status === 'IN_WAREHOUSE' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                             <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-500"
                                                                onSelect={(e) => e.preventDefault()}
                                                            >
                                                                <Archive className="mr-2 h-4 w-4" /> Decommission
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will decommission asset: <strong>{asset.assetCode}</strong>.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDecommission(asset.id)}>Confirm</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}

                                                {asset.status === 'DECOMMISSIONED' && (
                                                    <DropdownMenuItem onClick={() => handleReinstate(asset.id)}>
                                                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Reinstate
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
        </Card>
    );
}