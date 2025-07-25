// src/pages/CreateSalePage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { Trash2 } from "lucide-react";
import axiosInstance from "@/api/axiosInstance";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function CreateSalePage() {
    const { t } = useTranslation(); // --- 2. เรียกใช้ Hook ---
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [fetchedItems, setFetchedItems] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    useEffect(() => {
        const initialItems = location.state?.initialItems || [];
        if (initialItems.length > 0) {
            setSelectedItems(initialItems);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchAvailableItems = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const response = await axiosInstance.get("/inventory", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        status: 'IN_STOCK',
                        search: debouncedItemSearch,
                        limit: 100
                    }
                });
                setFetchedItems(response.data.data);
            } catch (error) {
                toast.error("Failed to fetch available items.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailableItems();
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
            toast.error("Please add at least one item to the sale.");
            return;
        }

        const payload = {
            customerId: parseInt(selectedCustomerId),
            inventoryItemIds: selectedItems.map(item => item.id),
        };

        try {
            const response = await axiosInstance.post("/sales", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Sale created successfully!");
            navigate(`/sales/${response.data.id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create sale.");
        }
    };

    const subtotal = selectedItems.reduce((sum, item) => sum + item.productModel.sellingPrice, 0);
    const vat = subtotal * 0.07;
    const total = subtotal + vat;

    // --- 3. เปลี่ยนข้อความเป็น t('...') ทั้งหมด ---
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>{t('createSale_title')}</CardTitle>
                    <CardDescription>{t('createSale_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder={t('createSale_search_placeholder')}
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="mb-4"
                    />
                    <div className="h-[500px] overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr className="border-b">
                                    <th className="p-2 text-left">{t('tableHeader_productModel')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                    <th className="p-2 text-right">{t('tableHeader_price')}</th>
                                    <th className="p-2 text-center">{t('tableHeader_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="4" className="text-center p-4">Searching...</td></tr>
                                ) : availableItems.map(item => (
                                    <tr key={item.id} className="border-b">
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
                <CardHeader><CardTitle>{t('createSale_summary_title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('createSale_customer_label')}</Label>
                        <CustomerCombobox selectedValue={selectedCustomerId} onSelect={setSelectedCustomerId} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('createSale_selected_items', { count: selectedItems.length })}</h4>
                        {selectedItems.length > 0 ? (
                            <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                {selectedItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{item.productModel.modelNumber}</p>
                                            <p className="text-xs text-slate-500">{item.serialNumber}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(item)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-slate-500 text-center py-8">{t('createSale_no_items')}</p>)}
                    </div>
                    <Separator />
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('createSale_subtotal')}</span><span>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('createSale_vat')}</span><span>{vat.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between font-bold text-base"><span >{t('createSale_total_price')}</span><span>{total.toLocaleString('en-US', {minimumFractionDigits: 2})} THB</span></div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!selectedCustomerId || selectedItems.length === 0}>
                        {t('createSale_confirm_button')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}