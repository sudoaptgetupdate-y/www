// src/components/dialogs/CustomerFormDialog.jsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import useAuthStore from "@/store/authStore";
import axiosInstance from "@/api/axiosInstance";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

const initialFormData = {
    customerCode: "",
    name: "",
    phone: "",
    address: ""
};

export default function CustomerFormDialog({ isOpen, setIsOpen, customer, onSave }) {
    const { t } = useTranslation(); // --- 2. เรียกใช้ Hook ---
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                customerCode: customer.customerCode,
                name: customer.name,
                phone: customer.phone,
                address: customer.address
            });
            setIsEditMode(true);
        } else {
            setFormData(initialFormData);
            setIsEditMode(false);
        }
    }, [customer]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/customers/${customer.id}` : "/customers";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Customer ${isEditMode ? 'updated' : 'created'} successfully!`);
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save customer.`);
        }
    };

    // --- 3. เปลี่ยนข้อความเป็น t('...') ทั้งหมด ---
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? t('customer_form_edit_title') : t('customer_form_add_title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="customerCode">{t('customer_form_code')}</Label>
                        <Input id="customerCode" value={formData.customerCode} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('customer_form_name')}</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('customer_form_phone')}</Label>
                        <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('customer_form_address')}</Label>
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