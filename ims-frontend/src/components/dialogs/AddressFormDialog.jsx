// src/components/dialogs/AddressFormDialog.jsx

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

const initialFormData = {
    name: '',
    contactPerson: '',
    phone: '',
    address: ''
};

export default function AddressFormDialog({ isOpen, setIsOpen, address, onSave }) {
    const { t } = useTranslation(); // --- 2. เรียกใช้ Hook ---
    const [formData, setFormData] = useState(initialFormData);
    const token = useAuthStore((state) => state.token);
    const isEditMode = !!address;

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                name: address.name,
                contactPerson: address.contactPerson || '',
                phone: address.phone || '',
                address: address.address || ''
            });
        } else {
            setFormData(initialFormData);
        }
    }, [address, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/addresses/${address.id}` : "/addresses";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Address ${isEditMode ? 'updated' : 'created'} successfully!`);
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save address.`);
        }
    };
    
    // --- 3. เปลี่ยนข้อความเป็น t('...') ทั้งหมด ---
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? t('address_form_edit_title') : t('address_form_add_title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('address_form_name')}</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">{t('address_form_contact')}</Label>
                            <Input id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('address_form_phone')}</Label>
                            <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('address_form_address')}</Label>
                        <Input id="address" value={formData.address} onChange={handleInputChange} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}