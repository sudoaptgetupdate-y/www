// src/pages/EditSalePage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function EditSalePage() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const [initialCustomer, setInitialCustomer] = useState(null);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    const [loading, setLoading] = useState(true);
    
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    // useEffect สำหรับดึงข้อมูลตั้งต้นของ Sale ที่จะแก้ไข
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!token || !saleId) return;
            try {
                setLoading(true);
                const saleRes = await axiosInstance.get(`/sales/${saleId}`, { headers: { Authorization: `Bearer ${token}` } });
                const saleData = saleRes.data;
                
                setInitialCustomer(saleData.customer);
                setSelectedCustomerId(String(saleData.customerId));
                setSelectedItems(saleData.itemsSold);
                
                // ดึงรายการสินค้าทั้งหมดหลังจากได้ข้อมูล sale แล้ว
                const inventoryRes = await axiosInstance.get("/inventory-items", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { all: 'true', search: '' }
                });

                const selectedIds = new Set(saleData.itemsSold.map(i => i.id));
                setAvailableItems(inventoryRes.data.filter(item => !selectedIds.has(item.id)));

            } catch (error) {
                toast.error("Failed to fetch initial sale data.");
                navigate("/sales");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [saleId, token, navigate]);
    
    // useEffect สำหรับค้นหาสินค้า (ทำงานหลังจาก loading ข้อมูลตั้งต้นเสร็จ)
    useEffect(() => {
        const fetchInventoryOnSearch = async () => {
            if (loading || !token) return; // ไม่ต้องทำถ้ายังโหลดข้อมูลตั้งต้นไม่เสร็จ
            try {
                const inventoryRes = await axiosInstance.get("/inventory-items", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { all: 'true', search: debouncedItemSearch }
                });
                const selectedIds = new Set(selectedItems.map(i => i.id));
                setAvailableItems(inventoryRes.data.filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                toast.error("Failed to fetch inventory items.");
            }
        };
        fetchInventoryOnSearch();
    }, [debouncedItemSearch, loading, token]);

    const handleAddItem = (itemToAdd) => {
        setSelectedItems(prev => [...prev, itemToAdd]);
        setAvailableItems(prev => prev.filter(item => item.id !== itemToAdd.id));
    };
    
    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id));
        if (!itemSearch) {
            setAvailableItems(prev => [itemToRemove, ...prev]);
        }
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId) { toast.error("Please select a customer."); return; }
        if (selectedItems.length === 0) { toast.error("Please add at least one item to the sale."); return; }
        
        const payload = {
            customerId: parseInt(selectedCustomerId),
            inventoryItemIds: selectedItems.map(item => item.id),
        };
        try {
            await axiosInstance.put(`/sales/${saleId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Sale updated successfully!");
            navigate("/sales");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update sale.");
        }
    };
    
    if (loading) return <p>Loading sale data...</p>;

    const subtotal = selectedItems.reduce((total, item) => total + (item.productModel?.sellingPrice || 0), 0);
    const vatAmount = subtotal * 0.07;
    const total = subtotal + vatAmount;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Select Items</CardTitle>
                    <CardDescription>Add or remove items for this sale.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input 
                        placeholder="Search available items..." 
                        value={itemSearch} 
                        onChange={(e) => setItemSearch(e.target.value)} 
                        className="mb-4" 
                    />
                    <div className="h-96 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr className="border-b">
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-left">Brand</th>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Serial No.</th>
                                    <th className="p-2 text-right">Price</th>
                                    <th className="p-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {availableItems.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2">{item.productModel.category.name}</td>
                                    <td className="p-2">{item.productModel.brand.name}</td>
                                    <td className="p-2">{item.productModel.modelNumber}</td>
                                    <td className="p-2">{item.serialNumber || '-'}</td>
                                    <td className="p-2 text-right">{item.productModel.sellingPrice.toLocaleString()}</td>
                                    <td className="p-2 text-center"><Button size="sm" onClick={() => handleAddItem(item)}>Add</Button></td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Edit Sale (ID: {saleId})</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <CustomerCombobox
                             selectedValue={selectedCustomerId}
                             onSelect={setSelectedCustomerId}
                             initialCustomer={initialCustomer}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selected Items ({selectedItems.length})</h4>
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
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-stretch space-y-4">
                    <Separator />
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>VAT (7%)</span>
                        <span>{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total Price</span>
                        <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                    </div>
                    <Button size="lg" onClick={handleSubmit}>Save Changes</Button>
                </CardFooter>
            </Card>
        </div>
    );
}