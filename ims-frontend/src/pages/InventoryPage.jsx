// src/pages/InventoryPage.jsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { MoreHorizontal, View, ShoppingCart, ArrowRightLeft, Edit, Trash2, PlusCircle, Archive, History, ShieldAlert, ArchiveRestore, ShieldCheck, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { useTranslation } from "react-i18next";
import BatchAddInventoryDialog from "@/components/dialogs/BatchAddInventoryDialog";

const formatMacAddress = (value) => {
  const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 0) return '';
  return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const initialEditFormData = {
    serialNumber: "",
    macAddress: "",
    productModelId: "",
    status: "IN_STOCK",
};

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort, className }) => (
    <TableHead className={`cursor-pointer hover:bg-muted/50 ${className}`} onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);

export default function InventoryPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const location = useLocation();
    const initialStatus = location.state?.status || "All";

    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState(initialEditFormData);
    const [editingItemId, setEditingItemId] = useState(null);
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemToDecommission, setItemToDecommission] = useState(null);

    const {
        data: inventoryItems, pagination, isLoading, searchTerm, filters,
        sortBy, sortOrder, handleSortChange,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, handleFilterChange, refreshData
    } = usePaginatedFetch("/inventory", 10, { 
        status: initialStatus,
        categoryId: "All",
        brandId: "All"
    });

    const openEditDialog = (item) => {
        if (!item) return;
        setEditingItemId(item.id);
        setEditFormData({
            serialNumber: item.serialNumber, macAddress: item.macAddress || '',
            productModelId: item.productModelId, status: item.status,
        });
        setSelectedModelInfo(item.productModel);
        setIsMacRequired(item.productModel.category.requiresMacAddress);
        setIsSerialRequired(item.productModel.category.requiresSerialNumber);
        setIsEditDialogOpen(true);
    };

    const handleEditInputChange = (e) => {
        const { id, value } = e.target;
        const upperValue = (id === 'serialNumber') ? value.toUpperCase() : value;
        setEditFormData({ ...editFormData, [id]: upperValue });
    };

    const handleEditMacAddressChange = (e) => {
        const formatted = formatMacAddress(e.target.value);
        setEditFormData({ ...editFormData, macAddress: formatted });
    };

    const handleEditModelSelect = (model) => {
        if (model) {
            setEditFormData(prev => ({ ...prev, productModelId: model.id }));
            setSelectedModelInfo(model);
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
            if (!model.category.requiresMacAddress) setEditFormData(prev => ({ ...prev, macAddress: '' }));
            if (!model.category.requiresSerialNumber) setEditFormData(prev => ({ ...prev, serialNumber: '' }));
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (isMacRequired && editFormData.macAddress && !validateMacAddress(editFormData.macAddress)) {
            toast.error("Invalid MAC Address format. Please use XX:XX:XX:XX:XX:XX format.");
            return;
        }
        if (!editFormData.productModelId) {
            toast.error("Please select a Product Model.");
            return;
        }
        const payload = {
            serialNumber: editFormData.serialNumber || null,
            macAddress: editFormData.macAddress || null,
            productModelId: parseInt(editFormData.productModelId, 10),
            status: editFormData.status,
        };
        try {
            await axiosInstance.put(`/inventory/${editingItemId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Item updated successfully!`);
            refreshData();
            setIsEditDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save item.`);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/inventory/${itemToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Item deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete item.");
        } finally {
            setItemToDelete(null);
        }
    };

    const confirmDecommission = async () => {
        if (!itemToDecommission) return;
        try {
            await axiosInstance.patch(`/inventory/${itemToDecommission.id}/decommission`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Item has been decommissioned.");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to decommission item.");
        } finally {
            setItemToDecommission(null);
        }
    };

    const handleStatusChange = async (itemId, action, successMessage) => {
        try {
            await axiosInstance.patch(`/inventory/${itemId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(successMessage);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to update status.`);
        }
    };

    const handleReinstateItem = (itemId) => {
        handleStatusChange(itemId, 'reinstate', 'Item has been reinstated to stock.');
    };

    const handleSellItem = (itemToSell) => navigate('/sales/new', { state: { initialItems: [itemToSell] } });
    const handleBorrowItem = (itemToBorrow) => navigate('/borrowings/new', { state: { initialItems: [itemToBorrow] } });

    return (
        <Card className="shadow-sm border-subtle">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{t('inventory')} Management</CardTitle>
                        <CardDescription>Manage all inventory items for sale.</CardDescription>
                    </div>
                    {canManage &&
                        <Button onClick={() => setIsBatchAddOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Inventory Item
                        </Button>
                    }
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Input
                        placeholder="Search by Serial, MAC, Model..."
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
                            <SelectItem value="IN_STOCK">In Stock</SelectItem>
                            <SelectItem value="SOLD">Sold</SelectItem>
                            <SelectItem value="BORROWED">Borrowed</SelectItem>
                            <SelectItem value="RESERVED">Reserved</SelectItem>
                            <SelectItem value="DEFECTIVE">Defective</SelectItem>
                            <SelectItem value="DECOMMISSIONED">Archived</SelectItem>
                            <SelectItem value="RETURNED_TO_CUSTOMER">Serviced (Customer)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHeader sortKey="productModel" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_productModel')}</SortableHeader>
                            <SortableHeader sortKey="serialNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_serialNumber')}</SortableHeader>
                            <SortableHeader sortKey="macAddress" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_macAddress')}</SortableHeader>
                            <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                            <TableHead>{t('tableHeader_addedBy')}</TableHead>
                            <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><div className="h-8 bg-muted rounded animate-pulse"></div></TableCell>
                                </TableRow>
                            ))
                        ) : inventoryItems.length > 0 ? (
                            inventoryItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.productModel.modelNumber}</TableCell>
                                    <TableCell>{item.serialNumber || '-'}</TableCell>
                                    <TableCell>{item.macAddress || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge
                                            status={item.status}
                                            className="w-24"
                                            onClick={() => {
                                                if (item.status === 'SOLD' && item.saleId) navigate(`/sales/${item.saleId}`);
                                                else if (item.status === 'BORROWED' && item.borrowingId) navigate(`/borrowings/${item.borrowingId}`);
                                                else if ((item.status === 'REPAIRING' || item.status === 'RETURNED_TO_CUSTOMER') && item.repairId) navigate(`/repairs/${item.repairId}`);
                                            }}
                                            interactive={!!(item.saleId || item.borrowingId || item.repairId)}
                                        />
                                    </TableCell>
                                    <TableCell>{item.addedBy.name}</TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}/history`)}>
                                                    <History className="mr-2 h-4 w-4" /> View History
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (item.status === 'SOLD') navigate(`/sales/${item.saleId}`);
                                                        if (item.status === 'BORROWED') navigate(`/borrowings/${item.borrowingId}`);
                                                    }}
                                                    disabled={item.status !== 'SOLD' && item.status !== 'BORROWED'}
                                                >
                                                    <View className="mr-2 h-4 w-4" /> View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleSellItem(item)}
                                                    disabled={item.status !== 'IN_STOCK'}
                                                >
                                                    <ShoppingCart className="mr-2 h-4 w-4" /> Sell This Item
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleBorrowItem(item)}
                                                    disabled={item.status !== 'IN_STOCK'}
                                                >
                                                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Borrow This Item
                                                </DropdownMenuItem>
                                                {canManage && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => openEditDialog(item)}
                                                            disabled={!['IN_STOCK', 'RESERVED', 'DEFECTIVE'].includes(item.status)}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        {item.status === 'IN_STOCK' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'reserve', 'Item marked as RESERVED.')}>
                                                                    <ArchiveRestore className="mr-2 h-4 w-4" /> Mark as Reserved
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-orange-600 focus:text-orange-500" onClick={() => handleStatusChange(item.id, 'defect', 'Item marked as DEFECTIVE.')}>
                                                                    <ShieldAlert className="mr-2 h-4 w-4" /> Mark as Defective
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {item.status === 'RESERVED' && (
                                                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'unreserve', 'Item is now IN STOCK.')}>
                                                                <ArrowRightLeft className="mr-2 h-4 w-4" /> Unreserve
                                                            </DropdownMenuItem>
                                                        )}
                                                         {item.status === 'DEFECTIVE' && (
                                                            <DropdownMenuItem className="text-green-600 focus:text-green-500" onClick={() => handleStatusChange(item.id, 'in-stock', 'Item marked as IN STOCK.')}>
                                                                <ShieldCheck className="mr-2 h-4 w-4" /> Mark as In Stock
                                                            </DropdownMenuItem>
                                                        )}
                                                        {item.status === 'DECOMMISSIONED' ? (
                                                            <DropdownMenuItem onClick={() => handleReinstateItem(item.id)}>
                                                                <ArrowRightLeft className="mr-2 h-4 w-4" /> Reinstate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-500"
                                                                onSelect={(e) => e.preventDefault()}
                                                                disabled={!['IN_STOCK', 'DEFECTIVE'].includes(item.status)}
                                                                onClick={() => setItemToDecommission(item)}
                                                            >
                                                                <Archive className="mr-2 h-4 w-4" /> Decommission
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-500"
                                                            onSelect={(e) => e.preventDefault()}
                                                            disabled={!['IN_STOCK', 'RESERVED', 'DECOMMISSIONED'].includes(item.status)}
                                                            onClick={() => setItemToDelete(item)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan="6" className="text-center h-24">No items found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">Rows per page:</Label>
                    <Select value={pagination ? String(pagination.itemsPerPage) : "10"} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Page {pagination?.currentPage || 1} of {pagination?.totalPages || 1} ({pagination?.totalItems || 0} items)
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>Next</Button>
                </div>
            </CardFooter>

            <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the item: <strong>{itemToDelete?.serialNumber}</strong>.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!itemToDecommission} onOpenChange={(isOpen) => !isOpen && setItemToDecommission(null)}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will decommission the item: <strong>{itemToDecommission?.serialNumber || itemToDecommission?.macAddress}</strong>.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDecommission}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {isBatchAddOpen && (
                <BatchAddInventoryDialog isOpen={isBatchAddOpen} setIsOpen={setIsBatchAddOpen} onSave={refreshData} />
            )}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                             <Label>Product Model</Label>
                             <ProductModelCombobox onSelect={handleEditModelSelect} initialModel={selectedModelInfo} />
                        </div>
                        {selectedModelInfo && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Category</Label><Input value={selectedModelInfo.category.name} disabled /></div>
                                <div className="space-y-2"><Label>Brand</Label><Input value={selectedModelInfo.brand.name} disabled /></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">Serial Number {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                            <Input id="serialNumber" value={editFormData.serialNumber || ''} onChange={handleEditInputChange} required={isSerialRequired} disabled={!isSerialRequired} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="macAddress">MAC Address {!isMacRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                             <Input
                                id="macAddress"
                                value={editFormData.macAddress || ''}
                                onChange={handleEditMacAddressChange}
                                required={isMacRequired}
                                disabled={!isMacRequired}
                                maxLength={17}
                                placeholder="AA:BB:CC:DD:EE:FF"
                             />
                        </div>
                        <DialogFooter><Button type="submit">Save Changes</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}