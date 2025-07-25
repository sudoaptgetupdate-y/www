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
import { useState } from "react";
import BatchAddAssetDialog from "@/components/dialogs/BatchAddAssetDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);

export default function AssetPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{t('assetList_title')}</CardTitle>
                        <CardDescription>{t('assetList_description')}</CardDescription>
                    </div>
                    {canManage &&
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setIsBatchAddOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('asset_add_new')}
                            </Button>
                            <Button onClick={() => navigate('/asset-assignments/new')}>
                               <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('assignments')}
                            </Button>
                        </div>
                    }
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Input
                        placeholder={t('asset_search_placeholder')}
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
                            <SelectValue placeholder={t('filter_by_status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">{t('status_all')}</SelectItem>
                            <SelectItem value="IN_WAREHOUSE">{t('status_in_warehouse')}</SelectItem>
                            <SelectItem value="ASSIGNED">{t('status_assigned')}</SelectItem>
                            <SelectItem value="DECOMMISSIONED">{t('status_archived')}</SelectItem>
                            <SelectItem value="DEFECTIVE">{t('status_defective')}</SelectItem>
                            <SelectItem value="REPAIRING">{t('status_repairing')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {/* --- START: แก้ไขลำดับคอลัมน์ --- */}
                            <SortableHeader sortKey="assetCode" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                {t('tableHeader_assetCode')}
                            </SortableHeader>
                            <SortableHeader sortKey="brand" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                {t('tableHeader_brand')}
                            </SortableHeader>
                            <SortableHeader sortKey="productModel" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                {t('tableHeader_productModel')}
                            </SortableHeader>
                            {/* --- END --- */}
                            <SortableHeader sortKey="serialNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                {t('tableHeader_serialNumber')}
                            </SortableHeader>
                            <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                            <TableHead>{t('tableHeader_assignedTo')}</TableHead>
                            <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                        ) : assets.map((asset) => (
                            <TableRow key={asset.id}>
                                {/* --- START: แก้ไขลำดับ Cell --- */}
                                <TableCell>{asset.assetCode}</TableCell>
                                <TableCell>{asset.productModel.brand.name}</TableCell>
                                <TableCell>{asset.productModel?.modelNumber || 'N/A'}</TableCell>
                                {/* --- END --- */}
                                <TableCell>{asset.serialNumber || 'N/A'}</TableCell>
                                <TableCell className="text-center">
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
                                </TableCell>
                                <TableCell>{asset.assignedTo?.name || '-'}</TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>{t('tableHeader_actions')}</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}/history`)}>
                                                <History className="mr-2 h-4 w-4" /> {t('action_view_history')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigate(`/assets/edit/${asset.id}`)}>
                                                <Edit className="mr-2 h-4 w-4" /> {t('action_edit_asset')}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleAssignItem(asset)}
                                                disabled={asset.status !== 'IN_WAREHOUSE'}
                                            >
                                                <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('action_assign_asset')}
                                            </DropdownMenuItem>

                                            {asset.status === 'IN_WAREHOUSE' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-500"
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            <Archive className="mr-2 h-4 w-4" /> {t('action_decommission')}
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>{t('asset_alert_decommission_title')}</AlertDialogTitle><AlertDialogDescription>{t('asset_alert_decommission_description')} <strong>{asset.assetCode}</strong>.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDecommission(asset.id)}>{t('confirm')}</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}

                                            {asset.status === 'DECOMMISSIONED' && (
                                                <DropdownMenuItem onClick={() => handleReinstate(asset.id)}>
                                                    <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('action_reinstate')}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">{t('rows_per_page')}</Label>
                    <Select value={String(pagination.itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    {t('pagination_info', { currentPage: pagination.currentPage, totalPages: pagination.totalPages, totalItems: pagination.totalItems })}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>{t('previous')}</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>{t('next')}</Button>
                </div>
            </CardFooter>

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