// src/pages/CreateAssetAssignmentPage.jsx

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
import { UserCombobox } from "@/components/ui/UserCombobox";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function CreateAssetAssignmentPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [fetchedAssets, setFetchedAssets] = useState([]);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [assetSearch, setAssetSearch] = useState("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const debouncedAssetSearch = useDebounce(assetSearch, 500);

    useEffect(() => {
        const initialItems = location.state?.initialItems || [];
        if (initialItems.length > 0) {
            setSelectedAssets(initialItems);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchAvailableAssets = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const response = await axiosInstance.get("/assets", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        status: 'IN_WAREHOUSE',
                        search: debouncedAssetSearch,
                        limit: 100
                    }
                });
                setFetchedAssets(response.data.data);
            } catch (error) {
                toast.error("Failed to fetch available assets.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailableAssets();
    }, [token, debouncedAssetSearch]);

    useEffect(() => {
        const selectedIds = new Set(selectedAssets.map(i => i.id));
        setAvailableAssets(fetchedAssets.filter(asset => !selectedIds.has(asset.id)));
    }, [selectedAssets, fetchedAssets]);

    const handleAddItem = (assetToAdd) => {
        setSelectedAssets(prev => [...prev, assetToAdd]);
    };

    const handleRemoveItem = (assetToRemove) => {
        setSelectedAssets(prev => prev.filter(asset => asset.id !== assetToRemove.id));
    };

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast.error("Please select an employee.");
            return;
        }
         if (selectedAssets.length === 0) {
            toast.error("Please add at least one asset.");
            return;
        }

        const payload = {
            assigneeId: parseInt(selectedUserId),
            inventoryItemIds: selectedAssets.map(item => item.id),
            notes: notes,
        };

        try {
            const response = await axiosInstance.post("/asset-assignments", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Assignment created successfully!");
            navigate(`/asset-assignments/${response.data.id}`, { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create assignment.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>{t('createAssignment_title')}</CardTitle>
                    <CardDescription>{t('createAssignment_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder={t('asset_search_placeholder')}
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="mb-4"
                    />
                    <div className="h-[500px] overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr className="border-b">
                                    <th className="p-2 text-left">{t('tableHeader_assetCode')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_productModel')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                    <th className="p-2 text-center">{t('tableHeader_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan="4" className="text-center p-4">Searching...</td></tr>
                                ) : availableAssets.map(asset => (
                                    <tr key={asset.id} className="border-b">
                                        <td className="p-2">{asset.assetCode}</td>
                                        <td className="p-2">{asset.productModel.modelNumber}</td>
                                        <td className="p-2">{asset.serialNumber || '-'}</td>
                                        <td className="p-2 text-center">
                                            <Button size="sm" onClick={() => handleAddItem(asset)}>{t('add')}</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>{t('createAssignment_summary_title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('createAssignment_assignee_label')}</Label>
                        <UserCombobox
                            selectedValue={selectedUserId}
                            onSelect={setSelectedUserId}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">{t('createBorrowing_notes_label')}</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('createSale_selected_items', { count: selectedAssets.length })}</h4>
                        {selectedAssets.length > 0 ? (
                            <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                {selectedAssets.map(asset => (
                                    <div key={asset.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{asset.assetCode}</p>
                                            <p className="text-xs text-slate-500">{asset.productModel.modelNumber}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(asset)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-slate-500 text-center py-8">{t('createSale_no_items')}</p>)}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!selectedUserId || selectedAssets.length === 0}
                    >
                        {t('createAssignment_confirm_button')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}