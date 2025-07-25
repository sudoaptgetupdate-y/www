// src/components/dialogs/SupplierFormDialog.jsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import useAuthStore from "@/store/authStore";
import axiosInstance from "@/api/axiosInstance";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

const initialFormData = {
    supplierCode: "",
    name: "",
    contactPerson: "",
    phone: "",
    address: ""
};

export default function SupplierFormDialog({ isOpen, setIsOpen, supplier, onSave }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);
    const isEditMode = !!supplier;

    useEffect(() => {
        if (isEditMode && supplier) {
            setFormData({
                supplierCode: supplier.supplierCode,
                name: supplier.name,
                contactPerson: supplier.contactPerson || "",
                phone: supplier.phone || "",
                address: supplier.address || ""
            });
        } else {
            setFormData(initialFormData);
        }
    }, [supplier, isOpen, isEditMode]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/suppliers/${supplier.id}` : "/suppliers";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Supplier ${isEditMode ? 'updated' : 'created'} successfully!`);
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save supplier.`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? t('supplier_form_edit_title') : t('supplier_form_add_title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplierCode">{t('supplier_form_code')}</Label>
                            <Input id="supplierCode" value={formData.supplierCode} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('supplier_form_name')}</Label>
                            <Input id="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">{t('tableHeader_contactPerson')}</Label>
                            <Input id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('tableHeader_phone')}</Label>
                            <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('tableHeader_address')}</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}