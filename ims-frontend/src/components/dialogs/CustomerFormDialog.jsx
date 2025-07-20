// src/components/dialogs/CustomerFormDialog.jsx

import { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';

export default function CustomerFormDialog({ open, onOpenChange, customer, isEditMode, onSuccess }) {
    const [formData, setFormData] = useState({
        customerCode: '',
        name: '',
        phone: '',
        address: ''
    });
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (open && isEditMode && customer) {
            setFormData({
                customerCode: customer.customerCode.toUpperCase(), // --- แก้ไข ---
                name: customer.name,
                phone: customer.phone || '',
                address: customer.address || ''
            });
        } else if (open && !isEditMode) {
            setFormData({ customerCode: '', name: '', phone: '', address: '' });
        }
    }, [open, isEditMode, customer]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        // --- START: ส่วนที่แก้ไข ---
        if (id === 'customerCode') {
            setFormData(prev => ({ ...prev, [id]: value.toUpperCase() }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
        // --- END ---
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode
            ? `/customers/${customer.id}`
            : '/customers';
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(`Customer ${isEditMode ? 'updated' : 'created'} successfully.`);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} customer.`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update the customer details below.' : 'Fill in the form to create a new customer.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerCode">Customer Code</Label>
                            <Input id="customerCode" value={formData.customerCode} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={formData.name} onChange={handleChange} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={formData.phone} onChange={handleChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" value={formData.address} onChange={handleChange} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}