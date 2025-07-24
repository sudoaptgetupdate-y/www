// src/components/dialogs/BatchAddAssetDialog.jsx

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

const MAX_ASSETS_MANUAL = 10;

export default function BatchAddAssetDialog({ isOpen, setIsOpen, onSave }) {
    const [selectedModel, setSelectedModel] = useState(null);
    const [manualItems, setManualItems] = useState([{ assetCode: '', serialNumber: '', macAddress: '' }]);
    const [listText, setListText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    const handleModelSelect = (model) => {
        setSelectedModel(model);
    };

    const handleManualItemChange = (index, field, value) => {
        const newItems = [...manualItems];
        newItems[index][field] = value.toUpperCase();
        setManualItems(newItems);
    };

    const addManualItemRow = () => {
        if (manualItems.length < MAX_ASSETS_MANUAL) {
            setManualItems([...manualItems, { assetCode: '', serialNumber: '', macAddress: '' }]);
        } else {
            toast.info(`You can add a maximum of ${MAX_ASSETS_MANUAL} assets at a time.`);
        }
    };

    const removeManualItemRow = (index) => {
        const newItems = manualItems.filter((_, i) => i !== index);
        setManualItems(newItems);
    };

    const handleSubmit = async (activeTab) => {
        if (!selectedModel) {
            toast.error("Please select a Product Model first.");
            return;
        }
        setIsLoading(true);

        let itemsPayload = [];
        let hasError = false;

        if (activeTab === 'manual') {
            itemsPayload = manualItems
                .filter(item => item.assetCode) // Asset Code is mandatory
                .map(item => {
                    if (!item.assetCode.trim()) hasError = true;
                    return {
                        assetCode: item.assetCode.trim(),
                        serialNumber: item.serialNumber.trim() || null,
                        macAddress: item.macAddress.trim() || null,
                    }
                });
        } else { // 'list' tab
            itemsPayload = listText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const parts = line.split(/[,\t]/).map(part => part.trim());
                    const assetCode = parts[0];
                    if (!assetCode) hasError = true;
                    return {
                        assetCode: assetCode,
                        serialNumber: parts[1] || null,
                        macAddress: parts[2] || null,
                    };
                });
        }

        if (hasError) {
            toast.error("Asset Code is required for all items.");
            setIsLoading(false);
            return;
        }
        
        if (itemsPayload.length === 0) {
            toast.error("Please add at least one asset to save.");
            setIsLoading(false);
            return;
        }

        const payload = {
            productModelId: selectedModel.id,
            items: itemsPayload,
        };

        try {
            const response = await axiosInstance.post('/assets/batch', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message);
            onSave();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add assets.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        setIsOpen(false);
        setSelectedModel(null);
        setManualItems([{ assetCode: '', serialNumber: '', macAddress: '' }]);
        setListText("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Add Multiple Company Assets</DialogTitle>
                    <DialogDescription>Select a product model, then add assets using one of the methods below.</DialogDescription>
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
                                    <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                                        <Label className="flex-1">Asset Code*</Label>
                                        <Label className="flex-1">Serial Number</Label>
                                        <Label className="flex-1">MAC Address</Label>
                                        <div className="w-9"></div>
                                    </div>
                                    {manualItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                placeholder="Asset Code"
                                                value={item.assetCode}
                                                onChange={(e) => handleManualItemChange(index, 'assetCode', e.target.value)}
                                                required
                                            />
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
                                        {isLoading ? 'Saving...' : `Save ${manualItems.filter(i => i.assetCode).length} Assets`}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                            <TabsContent value="list" className="mt-4">
                               <Label htmlFor="list-input">Paste from Excel or Text file</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Each item must be on a new line. Use a **Tab** (from Excel) or a **comma (,)** to separate Asset Code, Serial Number, and MAC Address.
                                </p>
                                <Textarea
                                    id="list-input"
                                    className="h-48 font-mono text-sm"
                                    placeholder={
`[Example from Excel or Tab-separated]
ASSET-001	SN-001	AA:BB:CC:11:11:11
ASSET-002	SN-002

[Example from Text file or Comma-separated]
ASSET-003,SN-003,DD:EE:FF:33:33:33
ASSET-004,,EE:FF:AA:44:44:44`
                                    }
                                    value={listText}
                                    onChange={(e) => setListText(e.target.value)}
                                />
                                 <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('list')} disabled={isLoading}>
                                        {isLoading ? 'Saving...' : `Save ${listText.split('\n').filter(l => l.trim()).length} Assets`}
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