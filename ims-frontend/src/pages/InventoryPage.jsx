// src/pages/InventoryPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { MoreHorizontal, View, ShoppingCart, ArrowRightLeft, Edit, Trash2, PlusCircle, Archive, History, ShieldAlert, ArchiveRestore, ShieldCheck } from "lucide-react"; // <-- เพิ่ม ShieldCheck
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

const formatMacAddress = (value) => {
  const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 0) return '';
  return cleaned.match(/.{1,2}/g).slice(0, 6).join(':');
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const initialFormData = {
    serialNumber: "",
    macAddress: "",
    productModelId: "",
    status: "IN_STOCK",
};

export default function InventoryPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: inventoryItems, pagination, isLoading, searchTerm, filters,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, handleFilterChange, refreshData
    } = usePaginatedFetch("/inventory", 10, { 
        status: "All",
        categoryId: "All",
        brandId: "All"
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingItemId, setEditingItemId] = useState(null);
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemToDecommission, setItemToDecommission] = useState(null);

    const openDialog = (item = null) => {
        if (item) {
            setIsEditMode(true);
            setEditingItemId(item.id);
            setFormData({
                serialNumber: item.serialNumber, macAddress: item.macAddress || '',
                productModelId: item.productModelId, status: item.status,
            });
            setSelectedModelInfo(item.productModel);
            setIsMacRequired(item.productModel.category.requiresMacAddress);
            setIsSerialRequired(item.productModel.category.requiresSerialNumber);
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
            setSelectedModelInfo(null);
            setIsMacRequired(true);
            setIsSerialRequired(true);
        }
        setIsDialogOpen(true);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        if (id === 'serialNumber') {
            setFormData({ ...formData, [id]: value.toUpperCase() });
        } else {
            setFormData({ ...formData, [id]: value });
        }
    };

    const handleMacAddressChange = (e) => {
        const formatted = formatMacAddress(e.target.value);
        setFormData({ ...formData, macAddress: formatted });
    };

    const handleModelSelect = (model) => {
        if (model) {
            setFormData(prev => ({ ...prev, productModelId: model.id }));
            setSelectedModelInfo(model);
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
             if (!model.category.requiresMacAddress) setFormData(prev => ({ ...prev, macAddress: '' }));
             if (!model.category.requiresSerialNumber) setFormData(prev => ({ ...prev, serialNumber: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isMacRequired && formData.macAddress && !validateMacAddress(formData.macAddress)) {
            toast.error("Invalid MAC Address format. Please use XX:XX:XX:XX:XX:XX format.");
            return;
        }

        if (!formData.productModelId) {
            toast.error("Please select a Product Model.");
            return;
        }

        const url = isEditMode ? `/inventory/${editingItemId}` : "/inventory";
        const method = isEditMode ? 'put' : 'post';

        const payload = {
            serialNumber: formData.serialNumber || null,
            macAddress: formData.macAddress || null,
            productModelId: parseInt(formData.productModelId, 10),
            status: formData.status,
        };

        try {
            await axiosInstance[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Item ${isEditMode ? 'updated' : 'added'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
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

    const handleReinstateItem = async (itemId) => {
        handleStatusChange(itemId, 'reinstate', 'Item has been reinstated to stock.');
    };

    const handleSellItem = (itemToSell) => {
        navigate('/sales/new', { state: { initialItems: [itemToSell] } });
    };
    const handleBorrowItem = (itemToBorrow) => navigate('/borrowings/new', { state: { initialItems: [itemToBorrow] } });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Inventory Item Management</CardTitle>
                 {canManage &&
                    <Button onClick={() => openDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Inventory Item
                    </Button>
                }
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                            <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <colgroup>
                            <col className="w-[20%]" />
                            <col className="w-[25%]" />
                            <col className="w-[20%]" />
                            <col className="w-[120px]" />
                            <col className="w-[15%]" />
                            <col className="w-[80px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Product Model</th>
                                <th className="p-2 text-left">Serial Number</th>
                                <th className="p-2 text-left">MAC Address</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-left">Added By</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : inventoryItems.length > 0 ? (
                                inventoryItems.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2 truncate">{item.serialNumber || '-'}</td>
                                        <td className="p-2 truncate">{item.macAddress || '-'}</td>
                                        <td className="p-2 text-center">
                                            <StatusBadge status={item.status} className="w-24" />
                                        </td>
                                        <td className="p-2">{item.addedBy.name}</td>
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
                                                                onClick={() => openDialog(item)}
                                                                disabled={item.status === 'SOLD' || item.status === 'BORROWED' || item.status === 'DECOMMISSIONED'}
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            
                                                            {/* --- START: ส่วนที่แก้ไข --- */}
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
                                                            {/* --- END: ส่วนที่แก้ไข --- */}

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
                                                                disabled={item.status === 'SOLD' || item.status === 'BORROWED' || item.status === 'DEFECTIVE'}
                                                                onClick={() => setItemToDelete(item)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="text-center p-4">No items found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Item</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                             <Label>Product Model</Label>
                             <ProductModelCombobox onSelect={handleModelSelect} initialModel={selectedModelInfo} />
                        </div>
                        {selectedModelInfo && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Category</Label><Input value={selectedModelInfo.category.name} disabled /></div>
                                <div className="space-y-2"><Label>Brand</Label><Input value={selectedModelInfo.brand.name} disabled /></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">Serial Number {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                            <Input id="serialNumber" value={formData.serialNumber || ''} onChange={handleInputChange} required={isSerialRequired} disabled={!isSerialRequired} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="macAddress">MAC Address {!isMacRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                             <Input
                                id="macAddress"
                                value={formData.macAddress || ''}
                                onChange={handleMacAddressChange}
                                required={isMacRequired}
                                disabled={!isMacRequired}
                                maxLength={17}
                                placeholder="AA:BB:CC:DD:EE:FF"
                             />
                        </div>
                        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}