// src/components/dialogs/BatchAddInventoryDialog.jsx

import { useState, useRef, useEffect } from "react"; // *** 1. Import useRef และ useEffect ***
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
import { translateThaiToEnglish } from "@/lib/keyboardUtils";

const MAX_ITEMS_MANUAL = 10;

const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

export default function BatchAddInventoryDialog({ isOpen, setIsOpen, onSave }) {
    const [selectedModel, setSelectedModel] = useState(null);
    const [manualItems, setManualItems] = useState([{ serialNumber: '', macAddress: '' }]);
    const [listText, setListText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    // *** 2. สร้าง Refs สำหรับจัดการ Focus ***
    const inputRefs = useRef([]);
    const firstInputRef = useRef(null);

    // *** 3. เพิ่ม useEffect สำหรับ Auto-focus เมื่อ Dialog เปิด ***
    useEffect(() => {
        if (isOpen && selectedModel) {
            // ใช้ Timeout เล็กน้อยเพื่อให้แน่ใจว่า Input ถูก Render ใน DOM แล้ว
            setTimeout(() => {
                firstInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, selectedModel]); // ทำงานเมื่อ Dialog เปิดและมีการเลือก Model แล้ว

    const handleModelSelect = (model) => {
        setSelectedModel(model);
    };

    const handleManualItemChange = (index, field, value) => {
        const newItems = [...manualItems];
        let processedValue = translateThaiToEnglish(value);

        if (field === 'macAddress') {
            processedValue = formatMacAddress(processedValue);
        } else {
            processedValue = processedValue.toUpperCase();
        }
        
        newItems[index][field] = processedValue;
        setManualItems(newItems);
    };

    const addManualItemRow = () => {
        if (manualItems.length < MAX_ITEMS_MANUAL) {
            setManualItems([...manualItems, { serialNumber: '', macAddress: '' }]);
            // Focus ที่ช่อง SN ของแถวใหม่ที่เพิ่มเข้ามา
            setTimeout(() => {
                const nextIndex = manualItems.length * 2;
                inputRefs.current[nextIndex]?.focus();
            }, 100);
        } else {
            toast.info(`You can add a maximum of ${MAX_ITEMS_MANUAL} items at a time.`);
        }
    };

    const removeManualItemRow = (index) => {
        const newItems = manualItems.filter((_, i) => i !== index);
        setManualItems(newItems);
    };
    
    // *** 4. เพิ่มฟังก์ชันสำหรับจัดการการกดปุ่ม Enter ***
    const handleKeyDown = (e, index, field) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // ป้องกันการ Submit Form โดยไม่ได้ตั้งใจ
            if (field === 'serialNumber') {
                // ถ้ากด Enter ที่ช่อง SN ให้เลื่อนไปช่อง MAC
                const macInputIndex = index * 2 + 1;
                inputRefs.current[macInputIndex]?.focus();
            } else if (field === 'macAddress') {
                // ถ้ากด Enter ที่ช่อง MAC
                if (index === manualItems.length - 1) {
                    // และเป็นแถวสุดท้าย ให้เพิ่มแถวใหม่
                    addManualItemRow();
                } else {
                    // ถ้าไม่ใช่แถวสุดท้าย ให้เลื่อนไปช่อง SN ของแถวถัดไป
                    const nextSnInputIndex = (index + 1) * 2;
                    inputRefs.current[nextSnInputIndex]?.focus();
                }
            }
        }
    };

    const handleSubmit = async (activeTab) => {
        // ... (Logic การ Submit ไม่มีการเปลี่ยนแปลง) ...
        if (!selectedModel) {
            toast.error("Please select a Product Model first.");
            return;
        }
        setIsLoading(true);

        let itemsPayload = [];

        if (activeTab === 'manual') {
            itemsPayload = manualItems
                .filter(item => item.serialNumber || item.macAddress)
                .map(item => ({
                    serialNumber: item.serialNumber || null,
                    macAddress: item.macAddress || null,
                }));
        } else { // 'list' tab
            itemsPayload = listText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const parts = line.split(/[,\t]/).map(part => part.trim());
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
            onSave();
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
                                                // *** 5. เพิ่ม Ref และ onKeyDown ***
                                                ref={el => {
                                                    inputRefs.current[index * 2] = el;
                                                    if (index === 0) firstInputRef.current = el;
                                                }}
                                                placeholder="Serial Number"
                                                value={item.serialNumber}
                                                onChange={(e) => handleManualItemChange(index, 'serialNumber', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, index, 'serialNumber')}
                                                disabled={!selectedModel?.category.requiresSerialNumber}
                                            />
                                            <Input
                                                ref={el => inputRefs.current[index * 2 + 1] = el}
                                                placeholder="MAC Address"
                                                value={item.macAddress}
                                                onChange={(e) => handleManualItemChange(index, 'macAddress', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, index, 'macAddress')}
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