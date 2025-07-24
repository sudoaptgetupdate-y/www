// src/pages/AssetPage.jsx

import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, MoreHorizontal, History, Edit, ArrowRightLeft, Archive, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { useState } from "react"; // *** 1. เพิ่ม useState ***
import BatchAddAssetDialog from "@/components/dialogs/BatchAddAssetDialog"; // *** 2. Import Component ใหม่ ***

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

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort }) => (
    <th className="p-2 text-left cursor-pointer hover:bg-slate-50" onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </th>
);

export default function AssetPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    // *** 3. เพิ่ม State สำหรับควบคุม Dialog ใหม่ ***
    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);

    const {
        data: assets,
        pagination,
        isLoading,
        searchTerm,
        filters,
        sortBy, 
        sortOrder,
        handleSortChange,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange,
        refreshData
    } = usePaginatedFetch("/assets", 10, { 
        status: "All",
        categoryId: "All",
        brandId: "All"
    });

    const handleDecommission = async (assetId) => {
        try {
            await axiosInstance.patch(`/assets/${assetId}/decommission`, {}, {
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
            await axiosInstance.patch(`/assets/${assetId}/reinstate`, {}, {
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
                            {/* *** 4. เปลี่ยน onClick ของปุ่ม Add Asset *** */}
                            <Button variant="outline" onClick={() => setIsBatchAddOpen(true)}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Input
                        placeholder="Search by Asset Code, S/N, Model..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="sm:col-span-2 lg:col-span-1"
                    />
                     <CategoryCombobox
                        selectedValue={filters.categoryId}
                        onSelect={(value) => handleFilterChange('categoryId', value)}
                    />
                    <BrandCombobox
                        selectedValue={filters.brandId}
                        onSelect={(value) => handleFilterChange('brandId', value)}
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by Status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="IN_WAREHOUSE">In Warehouse</SelectItem>
                            <SelectItem value="ASSIGNED">Assigned</SelectItem>
                            <SelectItem value="DECOMMISSIONED">Archived</SelectItem>
                            <SelectItem value="DEFECTIVE">Defective</SelectItem>
                            <SelectItem value="REPAIRING">Repairing</SelectItem>
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
                                <SortableHeader sortKey="assetCode" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    Asset Code
                                </SortableHeader>
                                <SortableHeader sortKey="productModel" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    Product Model
                                </SortableHeader>
                                <SortableHeader sortKey="serialNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    Serial Number
                                </SortableHeader>
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
                                    <td className="p-2">{asset.productModel?.modelNumber || 'N/A'}</td>
                                    <td className="p-2">{asset.serialNumber || 'N/A'}</td>
                                    <td className="p-2 text-center">
                                        <StatusBadge 
                                            status={asset.status} 
                                            className="w-28"
                                            onClick={() => {
                                                if (asset.status === 'ASSIGNED' && asset.assignmentId) {
                                                    navigate(`/asset-assignments/${asset.assignmentId}`);
                                                } else if (asset.status === 'REPAIRING' && asset.repairId) {
                                                    navigate(`/repairs/${asset.repairId}`);
                                                }
                                            }}
                                            interactive={
                                                (asset.status === 'ASSIGNED' && asset.assignmentId) ||
                                                (asset.status === 'REPAIRING' && asset.repairId)
                                            }
                                        />
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

            {/* *** 5. เพิ่มการเรียกใช้ Dialog Component ใหม่ *** */}
            {isBatchAddOpen && (
                <BatchAddAssetDialog
                    isOpen={isBatchAddOpen}
                    setIsOpen={setIsBatchAddOpen}
                    onSave={refreshData}
                />
            )}

        </Card>
    );
}