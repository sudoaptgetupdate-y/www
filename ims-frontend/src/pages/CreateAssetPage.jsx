// src/pages/CreateAssetPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { ArrowLeft } from "lucide-react";

const formatMacAddress = (value) => {
  const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 0) return '';
  return cleaned.match(/.{1,2}/g).slice(0, 6).join(':');
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const initialFormData = {
    assetCode: "",
    serialNumber: "",
    macAddress: "",
    productModelId: "",
};

export default function CreateAssetPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);
    
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

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
            setSelectedModelInfo(model);
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
             if (!model.category.requiresMacAddress) setFormData(prev => ({ ...prev, macAddress: '' }));
             if (!model.category.requiresSerialNumber) setFormData(prev => ({ ...prev, serialNumber: '' }));
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isMacRequired && formData.macAddress && !validateMacAddress(formData.macAddress)) {
            toast.error("Invalid MAC Address format. Please use XX:XX:XX:XX:XX:XX format.");
            return;
        }

        if (!formData.productModelId) {
            toast.error("Please select a Product Model.");
            return;
        }
        if (!formData.assetCode) {
            toast.error("Asset Code is required.");
            return;
        }
        
        try {
            // --- START: ส่วนที่แก้ไข ---
            await axiosInstance.post("/assets", formData, { 
            // --- END: ส่วนที่แก้ไข ---
                headers: { Authorization: `Bearer ${token}` } 
            });
            toast.success(`Asset has been added to the warehouse successfully!`);
            navigate("/assets");
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to add asset.`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
             <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Asset List
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Add New Company Asset</CardTitle>
                    <CardDescription>Enter the details of the new asset to add it to the warehouse.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                             <Label>Product Model <span className="text-red-500">*</span></Label>
                             <ProductModelCombobox onSelect={handleModelSelect} />
                        </div>
                        {selectedModelInfo && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Category</Label><Input value={selectedModelInfo.category.name} disabled /></div>
                                <div className="space-y-2"><Label>Brand</Label><Input value={selectedModelInfo.brand.name} disabled /></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="assetCode">Asset Code <span className="text-red-500">*</span></Label>
                            <Input id="assetCode" value={formData.assetCode} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">Serial Number {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                            <Input id="serialNumber" value={formData.serialNumber || ''} onChange={handleInputChange} required={isSerialRequired} disabled={!isSerialRequired} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="macAddress">MAC Address {!isMacRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                             <Input 
                                id="macAddress" 
                                value={formData.macAddress} 
                                onChange={handleMacAddressChange} 
                                required={isMacRequired} 
                                disabled={!isMacRequired}
                                maxLength={17}
                                placeholder="AA:BB:CC:DD:EE:FF"
                             />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit">Add Asset</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}