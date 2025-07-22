// src/pages/CreateRepairPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Trash2, PlusCircle, UserPlus, History, Truck } from "lucide-react";
import { AddressCombobox } from "@/components/ui/AddressCombobox";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

const CustomerItemDialog = ({ onAddItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [serialNumber, setSerialNumber] = useState("");
    const [selectedModel, setSelectedModel] = useState(null);

    const handleSubmit = () => {
        if (!serialNumber || !selectedModel) {
            toast.error("Please enter a serial number and select a product model.");
            return;
        }
        onAddItem({
            id: `customer-${Date.now()}`, // Temporary ID
            serialNumber,
            productModelId: selectedModel.id,
            productModel: selectedModel,
            isCustomerItem: true,
        });
        setIsOpen(false);
        setSerialNumber("");
        setSelectedModel(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
                <PlusCircle className="mr-2" /> Register External Item
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register Item for Customer Repair</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Product Model</Label>
                        <ProductModelCombobox onSelect={setSelectedModel} />
                    </div>
                    <div className="space-y-2">
                        <Label>Serial Number</Label>
                        <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value.toUpperCase())} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit}>Add Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function CreateRepairPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const [repairType, setRepairType] = useState('INTERNAL'); // INTERNAL or CUSTOMER
    
    // States for Customer Repair
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);

    // States for Internal Repair
    const [internalItems, setInternalItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    // Common States
    const [selectedItems, setSelectedItems] = useState([]);
    const [senderId, setSenderId] = useState("");
    const [receiverId, setReceiverId] = useState("");
    const [notes, setNotes] = useState("");

    // --- START: ส่วนที่แก้ไข ---
    // useEffect to reset states when repairType changes
    useEffect(() => {
        setSelectedItems([]); // Always clear selected items
        if (repairType === 'INTERNAL') {
            // Reset customer-related states
            setSelectedCustomerId("");
            setSelectedCustomer(null);
            setPurchaseHistory([]);
        } else if (repairType === 'CUSTOMER') {
            // Reset internal-related states
            setItemSearch("");
            setInternalItems([]);
        }
    }, [repairType]);
    // --- END: ส่วนที่แก้ไข ---

    // Fetch internal items for internal repair
    useEffect(() => {
        if (repairType !== 'INTERNAL' || !token) return;

        const fetchItems = async () => {
            const params = { search: debouncedItemSearch, limit: 100 };
            try {
                const [invRes, assetRes] = await Promise.all([
                    axiosInstance.get('/inventory', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'IN_STOCK' } }),
                    axiosInstance.get('/assets', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'IN_WAREHOUSE' } })
                ]);
                const combined = [...invRes.data.data, ...assetRes.data.data];
                const selectedIds = new Set(selectedItems.map(i => i.id));
                setInternalItems(combined.filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                toast.error("Failed to search for items.");
            }
        };
        fetchItems();
    }, [repairType, debouncedItemSearch, token, selectedItems]);

    // Fetch customer's purchase history
    useEffect(() => {
        if (repairType !== 'CUSTOMER' || !selectedCustomerId || !token) {
            setPurchaseHistory([]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const [customerRes, historyRes] = await Promise.all([
                    axiosInstance.get(`/customers/${selectedCustomerId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${selectedCustomerId}/purchase-history`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setSelectedCustomer(customerRes.data);
                const selectedIds = new Set(selectedItems.map(i => i.id));
                setPurchaseHistory(historyRes.data.filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                toast.error("Failed to fetch customer's purchase history.");
            }
        };
        fetchHistory();
    }, [repairType, selectedCustomerId, token, selectedItems]);
    
    const handleAddItem = (itemToAdd) => {
        setSelectedItems(prev => [...prev, itemToAdd]);
    };

    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(selectedItems.filter(item => item.id !== itemToRemove.id));
    };

    const handleSubmit = async () => {
        if (!senderId || !receiverId || selectedItems.length === 0) {
            toast.error("Please select a sender, receiver, and at least one item.");
            return;
        }
        if (repairType === 'CUSTOMER' && !selectedCustomerId) {
            toast.error("Please select a customer.");
            return;
        }

        const payload = {
            senderId: parseInt(senderId),
            receiverId: parseInt(receiverId),
            notes,
            items: selectedItems.map(({ id, isCustomerItem, productModelId, serialNumber }) => ({
                id, isCustomerItem: !!isCustomerItem, productModelId, serialNumber
            }))
        };
        
        try {
            const response = await axiosInstance.post('/repairs', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Repair order created successfully!");
            navigate(`/repairs/${response.data.id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create repair order.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Choose Repair Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={repairType} onValueChange={setRepairType} className="flex gap-4">
                            <Label htmlFor="internal" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary w-full">
                                <RadioGroupItem value="INTERNAL" id="internal" className="sr-only" />
                                <Truck className="mb-3 h-6 w-6" />
                                Internal Repair
                            </Label>
                             <Label htmlFor="customer" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary w-full">
                                <RadioGroupItem value="CUSTOMER" id="customer" className="sr-only" />
                                <UserPlus className="mb-3 h-6 w-6" />
                                For Customer
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {repairType === 'INTERNAL' && (
                     <Card>
                        <CardHeader><CardTitle>Step 2: Select Company-Owned Items</CardTitle></CardHeader>
                        <CardContent>
                            <Input placeholder="Search company items by S/N, Asset Code..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                             <div className="mt-4 h-96 overflow-y-auto border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-100">
                                        <tr className="border-b"><th className="p-2 text-left">Identifier</th><th className="p-2 text-left">Product</th><th className="p-2 text-left">Type</th><th className="p-2 text-center">Action</th></tr>
                                    </thead>
                                    <tbody>
                                        {internalItems.map(item => (
                                            <tr key={item.id} className="border-b"><td className="p-2 font-semibold">{item.assetCode || item.serialNumber}</td><td className="p-2">{item.productModel.modelNumber}</td><td className="p-2">{item.itemType}</td><td className="p-2 text-center"><Button size="sm" onClick={() => handleAddItem(item)}>Add</Button></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {repairType === 'CUSTOMER' && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Step 2: Select Customer & Item</CardTitle>
                            <div className="flex items-center gap-2 pt-2">
                                <div className="flex-grow"><CustomerCombobox selectedValue={selectedCustomerId} onSelect={setSelectedCustomerId} /></div>
                                <Button variant="outline" size="sm" onClick={() => setIsCustomerFormOpen(true)}><UserPlus className="mr-2" />New</Button>
                            </div>
                        </CardHeader>
                        {selectedCustomerId && (
                             <CardContent>
                                <div className="flex gap-4 mb-4">
                                     <CustomerItemDialog onAddItem={handleAddItem} />
                                </div>
                                 <p className="text-sm text-muted-foreground mb-2 text-center">Or select from customer's purchase history below:</p>
                                <div className="h-80 overflow-y-auto border rounded-md">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-100">
                                            <tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">Serial No.</th><th className="p-2 text-left">Purchase Date</th><th className="p-2 text-center">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {purchaseHistory.map(item => (
                                                <tr key={item.id} className="border-b"><td className="p-2">{item.productModel.modelNumber}</td><td className="p-2">{item.serialNumber}</td><td className="p-2">{new Date(item.purchaseDate).toLocaleDateString()}</td><td className="p-2 text-center"><Button size="sm" onClick={() => handleAddItem(item)}>Add</Button></td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}
            </div>
            <Card>
                <CardHeader><CardTitle>Step 3: Repair Order Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>From (Sender)</Label><AddressCombobox selectedValue={senderId} onSelect={setSenderId} /></div>
                        <div className="space-y-2"><Label>To (Receiver)</Label><AddressCombobox selectedValue={receiverId} onSelect={setReceiverId} /></div>
                    </div>
                    <div className="space-y-2"><Label>Notes / Problem Description</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selected Items ({selectedItems.length})</h4>
                        <div className="h-48 overflow-y-auto space-y-2 pr-2">
                            {selectedItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                    <div>
                                        <p className="font-semibold">{item.productModel.modelNumber}</p>
                                        <p className="text-xs text-slate-500">{item.assetCode || item.serialNumber}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(item)}><Trash2 /></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit}>Create Repair Order</Button>
                </CardFooter>
            </Card>

            <CustomerFormDialog 
                open={isCustomerFormOpen}
                onOpenChange={setIsCustomerFormOpen}
                isEditMode={false}
                onSuccess={() => {}} // We don't need to refresh the main list here
            />
        </div>
    );
}