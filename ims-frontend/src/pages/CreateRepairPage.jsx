// src/pages/CreateRepairPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Trash2, PlusCircle } from "lucide-react";

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
                <PlusCircle className="mr-2" /> Register Customer's Item
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
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [addresses, setAddresses] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    
    const [senderId, setSenderId] = useState("");
    const [receiverId, setReceiverId] = useState("");
    const [notes, setNotes] = useState("");

    const debouncedItemSearch = useDebounce(itemSearch, 500);

    // Fetch addresses for dropdowns
    useEffect(() => {
        const fetchAddresses = async () => {
            try {
                const response = await axiosInstance.get('/addresses', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { all: 'true' }
                });
                setAddresses(response.data);
            } catch (error) {
                toast.error("Failed to fetch addresses.");
            }
        };
        fetchAddresses();
    }, [token]);

    // Fetch company's items available for repair
    useEffect(() => {
        const fetchItems = async () => {
            const params = { search: debouncedItemSearch, limit: 100 };
            try {
                // Fetch from both inventory and assets
                const [invRes, assetRes] = await Promise.all([
                    axiosInstance.get('/inventory', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'IN_STOCK' } }),
                    axiosInstance.get('/assets', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'IN_WAREHOUSE' } })
                ]);
                const combinedItems = [...invRes.data.data, ...assetRes.data.data];

                const selectedIds = new Set(selectedItems.map(i => i.id));
                setAvailableItems(combinedItems.filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                toast.error("Failed to search for items.");
            }
        };
        fetchItems();
    }, [debouncedItemSearch, token]); // <-- แก้ไข: เอา selectedItems ออก

    const handleAddItem = (itemToAdd) => {
        // --- START: ส่วนที่แก้ไข ---
        setSelectedItems(prev => [...prev, itemToAdd]);
        // Only remove from available list if it's not a customer item
        if (!itemToAdd.isCustomerItem) {
            setAvailableItems(prev => prev.filter(item => item.id !== itemToAdd.id));
        }
        // --- END: ส่วนที่แก้ไข ---
    };

    const handleRemoveItem = (itemToRemove) => {
        // --- START: ส่วนที่แก้ไข ---
        setSelectedItems(selectedItems.filter(item => item.id !== itemToRemove.id));
        // Only add back if it's not a customer item and there's no search term
        if (!itemToRemove.isCustomerItem && !itemSearch) {
            setAvailableItems(prev => [itemToRemove, ...prev]);
        }
        // --- END: ส่วนที่แก้ไข ---
    };

    const handleSubmit = async () => {
        if (!senderId || !receiverId || selectedItems.length === 0) {
            toast.error("Please select a sender, receiver, and at least one item.");
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
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Select Items to Send for Repair</CardTitle>
                    <CardDescription>Search for company-owned items or register an item for a customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-4">
                        <Input
                            placeholder="Search company items by S/N, Asset Code, etc..."
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            className="flex-grow"
                        />
                        <CustomerItemDialog onAddItem={handleAddItem} />
                    </div>
                    <div className="h-96 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr className="border-b">
                                    <th className="p-2 text-left">Identifier</th>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Type</th>
                                    <th className="p-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableItems.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2 font-semibold">{item.assetCode || item.serialNumber}</td>
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2">{item.itemType}</td>
                                        <td className="p-2 text-center"><Button size="sm" onClick={() => handleAddItem(item)}>Add</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Repair Order Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From (Sender)</Label>
                            <Select onValueChange={setSenderId}><SelectTrigger><SelectValue placeholder="Select sender..." /></SelectTrigger><SelectContent>
                                {addresses.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                            </SelectContent></Select>
                        </div>
                        <div className="space-y-2">
                            <Label>To (Receiver)</Label>
                            <Select onValueChange={setReceiverId}><SelectTrigger><SelectValue placeholder="Select receiver..." /></SelectTrigger><SelectContent>
                                {addresses.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                            </SelectContent></Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes / Problem Description</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
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
                    <Button className="w-full" size="lg" onClick={handleSubmit}>
                        Create Repair Order
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}