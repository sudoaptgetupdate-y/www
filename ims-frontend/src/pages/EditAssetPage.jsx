// src/pages/EditAssetPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

export default function EditAssetPage() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    
    const [formData, setFormData] = useState(null);
    const [initialModel, setInitialModel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

    useEffect(() => {
        const fetchAsset = async () => {
            try {
                const response = await axiosInstance.get(`/inventory-items/${assetId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const assetData = response.data;
                setFormData({
                    assetCode: assetData.assetCode,
                    serialNumber: assetData.serialNumber || '',
                    macAddress: assetData.macAddress || '',
                    productModelId: assetData.productModelId,
                });
                setInitialModel(assetData.productModel);
                setIsMacRequired(assetData.productModel.category.requiresMacAddress);
                setIsSerialRequired(assetData.productModel.category.requiresSerialNumber);
            } catch (error) {
                toast.error("Failed to fetch asset data.");
                navigate("/assets");
            } finally {
                setLoading(false);
            }
        };
        fetchAsset();
    }, [assetId, token, navigate]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isMacRequired && formData.macAddress && !validateMacAddress(formData.macAddress)) {
            toast.error("Invalid MAC Address format.");
            return;
        }
        try {
            await axiosInstance.put(`/inventory-items/${assetId}`, formData, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            toast.success("Asset updated successfully!");
            navigate(`/assets`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update asset.");
        }
    };

    if (loading || !formData) return <p>Loading asset data...</p>;

    return (
        <div className="max-w-2xl mx-auto">
            <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Asset List
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Asset</CardTitle>
                    <CardDescription>Update the details for asset code: {formData.assetCode}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                             <Label>Product Model <span className="text-red-500">*</span></Label>
                             <ProductModelCombobox onSelect={handleModelSelect} initialModel={initialModel} />
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
                    </CardContent>
                    <CardFooter>
                        <Button type="submit">Save Changes</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}