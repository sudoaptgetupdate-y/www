// src/pages/CreateBorrowingPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { Trash2 } from "lucide-react";
import axiosInstance from "@/api/axiosInstance";
import { useTranslation } from "react-i18next";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function CreateBorrowingPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [fetchedItems, setFetchedItems] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedBorrowerId, setSelectedBorrowerId] = useState("");
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
        const fetchAvailableItems = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const response = await axiosInstance.get("/inventory", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { status: 'IN_STOCK', search: debouncedItemSearch, limit: 100 }
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
        if (!selectedBorrowerId) {
            toast.error("Please select a borrower.");
            return;
        }
        if (selectedItems.length === 0) {
            toast.error("Please add at least one item.");
            return;
        }

        const payload = {
            borrowerId: parseInt(selectedBorrowerId),
            inventoryItemIds: selectedItems.map(item => item.id),
            dueDate: dueDate || null,
            notes: notes || null,
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
                    <CardTitle>{t('createBorrowing_title')}</CardTitle>
                    <CardDescription>{t('createBorrowing_description')}</CardDescription>
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
                                    <th className="p-2 text-center">{t('tableHeader_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="3" className="text-center p-4">Searching...</td></tr>
                                ) : availableItems.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2">{item.serialNumber || '-'}</td>
                                        <td className="p-2 text-center"><Button size="sm" onClick={() => handleAddItem(item)}>{t('add')}</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>{t('createBorrowing_summary_title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('createBorrowing_borrower_label')}</Label>
                        <CustomerCombobox selectedValue={selectedBorrowerId} onSelect={setSelectedBorrowerId} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('createBorrowing_dueDate_label')}</Label>
                        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('createBorrowing_notes_label')}</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('createSale_selected_items', { count: selectedItems.length })}</h4>
                        {selectedItems.length > 0 ? (
                            <div className="h-48 overflow-y-auto space-y-2 pr-2">
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
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!selectedBorrowerId || selectedItems.length === 0}>
                        {t('createBorrowing_confirm_button')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}