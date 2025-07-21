// src/components/dialogs/AddressFormDialog.jsx

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

const initialData = {
    name: '',
    contactPerson: '',
    phone: '',
    address: ''
};

export default function AddressFormDialog({ open, onOpenChange, address, isEditMode, onSuccess }) {
    const [formData, setFormData] = useState(initialData);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (open && isEditMode && address) {
            setFormData({
                name: address.name,
                contactPerson: address.contactPerson || '',
                phone: address.phone || '',
                address: address.address || ''
            });
        } else if (open && !isEditMode) {
            setFormData(initialData);
        }
    }, [open, isEditMode, address]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/addresses/${address.id}` : '/addresses';
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(`Address ${isEditMode ? 'updated' : 'created'} successfully.`);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save address.`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the address book entry.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Location Name (e.g., "Repair Center A")</Label>
                            <Input id="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input id="contactPerson" value={formData.contactPerson} onChange={handleChange} />
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