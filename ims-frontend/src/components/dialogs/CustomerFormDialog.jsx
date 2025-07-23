// src/components/dialogs/CustomerFormDialog.jsx

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

const initialFormData = {
    customerCode: '',
    name: '',
    phone: '',
    address: ''
};

export default function CustomerFormDialog({ isOpen, setIsOpen, customer, onSave }) {
    const [formData, setFormData] = useState(initialFormData);
    const token = useAuthStore((state) => state.token);
    const isEditMode = !!customer;

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                customerCode: customer.customerCode,
                name: customer.name,
                phone: customer.phone || '',
                address: customer.address || ''
            });
        } else {
            setFormData(initialFormData);
        }
    }, [customer, isOpen]);

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
        // --- START: แก้ไขบรรทัดนี้ ---
        } catch (error) {
        // --- END ---
            toast.error(error.response?.data?.error || `Failed to save customer.`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Customer</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="customerCode">Customer Code</Label>
                        <Input id="customerCode" value={formData.customerCode} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" value={formData.address} onChange={handleInputChange} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}