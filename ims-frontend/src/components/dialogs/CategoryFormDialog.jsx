// src/components/dialogs/CategoryFormDialog.jsx

import { useEffect, useState } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const initialData = {
    name: "",
    requiresMacAddress: true,
    requiresSerialNumber: true,
};

export default function CategoryFormDialog({ open, onOpenChange, category, isEditMode, onSuccess }) {
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        if (isEditMode && category) {
            setFormData({ 
                name: category.name,
                requiresMacAddress: category.requiresMacAddress ?? true,
                requiresSerialNumber: category.requiresSerialNumber ?? true,
            });
        } else {
            setFormData(initialData);
        }
    }, [isEditMode, category, open]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSwitchChange = (checked, fieldName) => {
        setFormData(prev => ({ ...prev, [fieldName]: checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode
            ? `/categories/${category.id}`
            : "/categories";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Category has been ${isEditMode ? 'updated' : 'created'} successfully.`);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save category.`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                    <DialogDescription>
                       {isEditMode ? `Editing category: ${category?.name}.` : "Enter the details for the new category."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Category Name</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                           <Label>Requires Serial Number?</Label>
                           <p className="text-[0.8rem] text-muted-foreground">
                               Enable if items in this category must have a Serial Number.
                           </p>
                        </div>
                        <Switch
                            checked={formData.requiresSerialNumber}
                            onCheckedChange={(checked) => handleSwitchChange(checked, 'requiresSerialNumber')}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                           <Label>Requires MAC Address?</Label>
                           <p className="text-[0.8rem] text-muted-foreground">
                               Enable if items in this category must have a MAC address.
                           </p>
                        </div>
                        <Switch
                            checked={formData.requiresMacAddress}
                            onCheckedChange={(checked) => handleSwitchChange(checked, 'requiresMacAddress')}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Category'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}