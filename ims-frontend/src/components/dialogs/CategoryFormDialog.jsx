// src/components/dialogs/CategoryFormDialog.jsx

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';

const initialFormData = {
    name: '',
    requiresMacAddress: true,
    requiresSerialNumber: true
};

// --- START: แก้ไขชื่อฟังก์ชัน ---
export default function CategoryFormDialog({ isOpen, setIsOpen, category, onSave }) {
// --- END ---
    const [formData, setFormData] = useState(initialFormData);
    const token = useAuthStore((state) => state.token);
    const isEditMode = !!category;

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                name: category.name,
                requiresMacAddress: category.requiresMacAddress,
                requiresSerialNumber: category.requiresSerialNumber
            });
        } else {
            setFormData(initialFormData);
        }
    }, [category, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleSwitchChange = (id, checked) => {
        setFormData({ ...formData, [id]: checked });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/categories/${category.id}` : "/categories";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Category ${isEditMode ? 'updated' : 'created'} successfully!`);
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save category.`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Category Name</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="requiresSerialNumber"
                            checked={formData.requiresSerialNumber}
                            onCheckedChange={(checked) => handleSwitchChange('requiresSerialNumber', checked)}
                        />
                        <Label htmlFor="requiresSerialNumber">Requires Serial Number</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch
                            id="requiresMacAddress"
                            checked={formData.requiresMacAddress}
                            onCheckedChange={(checked) => handleSwitchChange('requiresMacAddress', checked)}
                        />
                        <Label htmlFor="requiresMacAddress">Requires MAC Address</Label>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}