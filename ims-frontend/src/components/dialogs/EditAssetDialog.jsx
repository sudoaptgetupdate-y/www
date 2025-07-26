// src/components/dialogs/EditAssetDialog.jsx

import { useEffect, useState } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";

const formatMacAddress = (value) => {
  const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 0) return '';
  return cleaned.match(/.{1,2}/g).slice(0, 6).join(':');
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export default function EditAssetDialog({ isOpen, setIsOpen, asset, onSave }) {
    const token = useAuthStore((state) => state.token);
    
    const [formData, setFormData] = useState(null);
    const [initialModel, setInitialModel] = useState(null);
    const [initialSupplier, setInitialSupplier] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

    useEffect(() => {
        if (asset) {
            setFormData({
                assetCode: asset.assetCode,
                serialNumber: asset.serialNumber || '',
                macAddress: asset.macAddress || '',
                productModelId: asset.productModelId,
                status: asset.status,
                supplierId: asset.supplierId || "",
            });
            setInitialModel(asset.productModel);
            setInitialSupplier(asset.supplier);
            setIsMacRequired(asset.productModel.category.requiresMacAddress);
            setIsSerialRequired(asset.productModel.category.requiresSerialNumber);
        }
    }, [asset]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        if (id === 'serialNumber' || id === 'assetCode') {
            setFormData({ ...formData, [id]: value.toUpperCase() });
        } else {
            setFormData({ ...formData, [id]: value });
        }
    };
    
    const handleMacAddressChange = (e) => {
        const formatted = formatMacAddress(e.target.value);
        setFormData({ ...formData, macAddress: formatted });
    };

    const handleModelSelect = (model) => {
        if (model) {
            setFormData(prev => ({ ...prev, productModelId: model.id }));
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
            if (!model.category.requiresMacAddress) setFormData(prev => ({ ...prev, macAddress: '' }));
            if (!model.category.requiresSerialNumber) setFormData(prev => ({ ...prev, serialNumber: '' }));
        }
    };
    
    const handleSupplierSelect = (supplierId) => {
        setFormData(prev => ({ ...prev, supplierId: supplierId }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isMacRequired && formData.macAddress && !validateMacAddress(formData.macAddress)) {
            toast.error("Invalid MAC Address format.");
            return;
        }
        if (isSerialRequired && !formData.serialNumber?.trim()) {
            toast.error("Serial Number is required for this product category.");
            return;
        }
        if (isMacRequired && !formData.macAddress?.trim()) {
            toast.error("MAC Address is required for this product category.");
            return;
        }
        try {
            const payload = { ...formData, supplierId: formData.supplierId ? parseInt(formData.supplierId) : null };
            await axiosInstance.put(`/assets/${asset.id}`, payload, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            toast.success("Asset updated successfully!");
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update asset.");
        }
    };
    
    if (!formData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Asset</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                         <Label>Product Model <span className="text-red-500">*</span></Label>
                         <ProductModelCombobox onSelect={handleModelSelect} initialModel={initialModel} />
                    </div>
                    <div className="space-y-2">
                         <Label>Supplier</Label>
                         <SupplierCombobox 
                            selectedValue={formData.supplierId} 
                            onSelect={handleSupplierSelect} 
                            initialSupplier={initialSupplier} 
                         />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="assetCode">Asset Code <span className="text-red-500">*</span></Label>
                        <Input id="assetCode" value={formData.assetCode} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="serialNumber">Serial Number {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                        <Input id="serialNumber" value={formData.serialNumber} onChange={handleInputChange} disabled={!isSerialRequired} required={isSerialRequired} />
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="macAddress">MAC Address {!isMacRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                         <Input id="macAddress" value={formData.macAddress} onChange={handleMacAddressChange} disabled={!isMacRequired} required={isMacRequired} maxLength={17} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}