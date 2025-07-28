// src/components/dialogs/AddressFormDialog.jsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // <-- เปลี่ยนเป็น Textarea
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

const ADDRESS_MAX_LENGTH = 255; // กำหนดความยาวสูงสุดของที่อยู่

export default function AddressFormDialog({ isOpen, setIsOpen, address, onSave }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (address) {
            setFormData({
                name: address.name || '',
                contactPerson: address.contactPerson || '',
                phone: address.phone || '',
                address: address.address || ''
            });
        } else {
            setFormData({ name: '', contactPerson: '', phone: '', address: '' });
        }
    }, [address, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.address && formData.address.length > ADDRESS_MAX_LENGTH) {
            toast.error(`Address cannot exceed ${ADDRESS_MAX_LENGTH} characters.`);
            return;
        }

        const url = address ? `/addresses/${address.id}` : '/addresses';
        const method = address ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Address has been ${address ? 'updated' : 'created'} successfully.`);
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "An error occurred.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{address ? t('address_form_edit_title') : t('address_form_add_title')}</DialogTitle>
                     <DialogDescription>
                        Please fill in the address details below.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('address_form_name')}</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactPerson">{t('address_form_contact')}</Label>
                        <Input id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('address_form_phone')}</Label>
                        <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('address_form_address')}</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} rows={3} />
                        <p className={`text-xs text-right ${formData.address.length > ADDRESS_MAX_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {formData.address.length} / {ADDRESS_MAX_LENGTH}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}