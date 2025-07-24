// src/components/dialogs/BatchAddInventoryDialog.jsx

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { PlusCircle, XCircle } from "lucide-react";

const MAX_ITEMS_MANUAL = 10; // กำหนดจำนวนสูงสุดของการเพิ่มทีละแถว

export default function BatchAddInventoryDialog({ isOpen, setIsOpen, onSave }) {
    const [selectedModel, setSelectedModel] = useState(null);
    const [manualItems, setManualItems] = useState([{ serialNumber: '', macAddress: '' }]);
    const [listText, setListText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    const handleModelSelect = (model) => {
        setSelectedModel(model);
    };

    // --- Functions for "Add Manually" Tab ---
    const handleManualItemChange = (index, field, value) => {
        const newItems = [...manualItems];
        newItems[index][field] = value.toUpperCase();
        setManualItems(newItems);
    };

    const addManualItemRow = () => {
        if (manualItems.length < MAX_ITEMS_MANUAL) {
            setManualItems([...manualItems, { serialNumber: '', macAddress: '' }]);
        } else {
            toast.info(`You can add a maximum of ${MAX_ITEMS_MANUAL} items at a time.`);
        }
    };

    const removeManualItemRow = (index) => {
        const newItems = manualItems.filter((_, i) => i !== index);
        setManualItems(newItems);
    };

    // --- Function to handle submission ---
    const handleSubmit = async (activeTab) => {
        if (!selectedModel) {
            toast.error("Please select a Product Model first.");
            return;
        }
        setIsLoading(true);

        let itemsPayload = [];

        if (activeTab === 'manual') {
            itemsPayload = manualItems
                .filter(item => item.serialNumber || item.macAddress) // กรองแถวที่ว่างเปล่าออก
                .map(item => ({
                    serialNumber: item.serialNumber || null,
                    macAddress: item.macAddress || null,
                }));
        } else { // 'list' tab
            itemsPayload = listText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line) // กรองบรรทัดว่าง
                .map(line => {
                    const parts = line.split(/[,\t]/).map(part => part.trim()); // รองรับทั้ง comma และ tab
                    return {
                        serialNumber: parts[0] || null,
                        macAddress: parts[1] || null,
                    };
                });
        }
        
        if (itemsPayload.length === 0) {
            toast.error("Please add at least one item to save.");
            setIsLoading(false);
            return;
        }

        const payload = {
            productModelId: selectedModel.id,
            items: itemsPayload,
        };

        try {
            const response = await axiosInstance.post('/inventory/batch', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message);
            onSave(); // Refresh data on the main page
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add items.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedModel(null);
        setManualItems([{ serialNumber: '', macAddress: '' }]);
        setListText("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Add Multiple Inventory Items</DialogTitle>
                    <DialogDescription>Select a product model, then add items using one of the methods below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Product Model <span className="text-red-500">*</span></Label>
                        <ProductModelCombobox onSelect={handleModelSelect} />
                    </div>
                    {selectedModel && (
                        <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">Add Manually</TabsTrigger>
                                <TabsTrigger value="list">Add from List</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="mt-4">
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {manualItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                placeholder="Serial Number"
                                                value={item.serialNumber}
                                                onChange={(e) => handleManualItemChange(index, 'serialNumber', e.target.value)}
                                                disabled={!selectedModel?.category.requiresSerialNumber}
                                            />
                                            <Input
                                                placeholder="MAC Address"
                                                value={item.macAddress}
                                                onChange={(e) => handleManualItemChange(index, 'macAddress', e.target.value)}
                                                disabled={!selectedModel?.category.requiresMacAddress}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeManualItemRow(index)} disabled={manualItems.length === 1}>
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={addManualItemRow} className="mt-3">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Row
                                </Button>
                                <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('manual')} disabled={isLoading}>
                                        {isLoading ? 'Saving...' : `Save ${manualItems.filter(i => i.serialNumber || i.macAddress).length} Items`}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                            <TabsContent value="list" className="mt-4">
                               <Label htmlFor="list-input">Paste from Excel or Text file</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Each item must be on a new line. Use a **Tab** (from Excel) or a **comma (,)** to separate the Serial Number and MAC Address.
                                </p>
                                <Textarea
                                    id="list-input"
                                    className="h-48 font-mono text-sm"
                                    placeholder={
`[Example from Excel or Tab-separated]
SN-FROM-EXCEL	AA:BB:CC:11:22:33
SN-WITH-NO-MAC

[Example from Text file or Comma-separated]
SN-FROM-TEXT,DD:EE:FF:44:55:66
,EE:FF:AA:77:88:99`
                                    }
                                    value={listText}
                                    onChange={(e) => setListText(e.target.value)}
                                />
                                 <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('list')} disabled={isLoading}>
                                        {isLoading ? 'Saving...' : `Save ${listText.split('\n').filter(l => l.trim()).length} Items`}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}