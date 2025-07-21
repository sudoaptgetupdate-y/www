// src/pages/CreateBorrowingPage.jsx

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
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function CreateBorrowingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [fetchedItems, setFetchedItems] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    useEffect(() => {
        const initialItems = location.state?.initialItems || [];
        if (initialItems.length > 0) {
            setSelectedItems(initialItems);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchInventory = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const inventoryRes = await axiosInstance.get("/inventory", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        status: 'IN_STOCK',
                        search: debouncedItemSearch
                    }
                });
                setFetchedItems(inventoryRes.data.data);
            } catch (error) {
                toast.error("Failed to fetch inventory items.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInventory();
    }, [token, debouncedItemSearch]);

    useEffect(() => {
        const selectedIds = new Set(selectedItems.map(i => i.id));
        setAvailableItems(fetchedItems.filter(item => !selectedIds.has(item.id)));
    }, [selectedItems, fetchedItems]);


    const handleAddItem = (itemToAdd) => {
        setSelectedItems(prev => [...prev, itemToAdd]);
    };

    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id));
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId) {
            toast.error("Please select a customer.");
            return;
        }
         if (selectedItems.length === 0) {
            toast.error("Please add at least one item.");
            return;
        }

        const payload = {
            customerId: parseInt(selectedCustomerId),
            inventoryItemIds: selectedItems.map(item => item.id),
            dueDate: dueDate || null,
            notes: notes,
        };

        try {
            const response = await axiosInstance.post("/borrowings", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Borrowing record created successfully!");
            navigate(`/borrowings/${response.data.id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create borrowing record.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Select Items to Borrow</CardTitle>
                    <CardDescription>Search for available items and add them to the list.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder="Search by Serial No, MAC, or Product Model..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="mb-4"
                    />
                    <div className="h-96 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr className="border-b">
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Serial No.</th>
                                    <th className="p-2 text-left">MAC Address</th>
                                    <th className="p-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableItems.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2">{item.serialNumber || '-'}</td>
                                        <td className="p-2">{item.macAddress || '-'}</td>
                                        <td className="p-2 text-center">
                                            <Button size="sm" onClick={() => handleAddItem(item)}>Add</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Borrowing Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Customer (Borrower)</Label>
                        <CustomerCombobox
                            selectedValue={selectedCustomerId}
                            onSelect={setSelectedCustomerId}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date (Optional)</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any relevant notes here..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selected Items ({selectedItems.length})</h4>
                        {selectedItems.length > 0 ? (
                            <div className="h-48 overflow-y-auto space-y-2 pr-2">
                                {selectedItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{item.productModel.modelNumber}</p>
                                            <p className="text-xs text-slate-500">{item.serialNumber || 'No S/N'}</p>
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item)}>Remove</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-slate-500 text-center py-8">No items selected.</p>)}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!selectedCustomerId || selectedItems.length === 0}
                    >
                        Confirm Borrowing
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}