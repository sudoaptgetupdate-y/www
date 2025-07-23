// src/pages/UserManagementPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { Eye, UserPlus, Edit, Trash2, Package } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-20 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

const initialFormData = {
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    accountStatus: 'ACTIVE'
};

export default function UserManagementPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const {
        data: users, pagination, isLoading, searchTerm, handleSearchChange, handlePageChange, handleItemsPerPageChange, refreshData
    } = usePaginatedFetch("/users", 10);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const openDialog = (user = null) => {
        if (user) {
            setIsEditMode(true);
            setEditingUserId(user.id);
            setFormData({
                name: user.name,
                username: user.username,
                email: user.email,
                password: '', 
                role: user.role,
                accountStatus: user.accountStatus
            });
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
        }
        setIsDialogOpen(true);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };
    
    const handleSelectChange = (id, value) => {
        setFormData({ ...formData, [id]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/users/${editingUserId}` : "/users";
        const method = isEditMode ? 'put' : 'post';
        
        let payload = { ...formData };
        if (isEditMode && !payload.password) {
            delete payload.password;
        }

        try {
            await axiosInstance[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`User ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save user.`);
        }
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await axiosInstance.delete(`/users/${userToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("User deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete user.");
        } finally {
            setUserToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>{t('userManagement')}</CardTitle>
                <Button onClick={() => openDialog()}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add New User
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by name, email, or username..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">{t('tableHeader_name')}</th>
                                <th className="p-2 text-left">{t('tableHeader_email')}</th>
                                <th className="p-2 text-center">{t('tableHeader_role')}</th>
                                <th className="p-2 text-center">{t('tableHeader_status')}</th>
                                <th className="p-2 text-center">{t('tableHeader_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : users.map((user) => (
                                <tr key={user.id} className="border-b">
                                    <td className="p-2 font-semibold">{user.name}</td>
                                    <td className="p-2">{user.email}</td>
                                    <td className="p-2 text-center">
                                        <Badge variant={user.role === 'SUPER_ADMIN' ? 'destructive' : (user.role === 'ADMIN' ? 'secondary' : 'outline')}>
                                            {user.role}
                                        </Badge>
                                    </td>
                                    <td className="p-2 text-center">
                                        <Badge variant={user.accountStatus === 'ACTIVE' ? 'success' : 'destructive'}>
                                            {user.accountStatus}
                                        </Badge>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/users/${user.id}/assets`)}>
                                                <Package className="mr-2 h-4 w-4" /> Assets
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => openDialog(user)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">Rows per page:</Label>
                    <Select value={String(pagination.itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} items)
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>Next</Button>
                </div>
            </CardFooter>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" value={formData.username} onChange={handleInputChange} required disabled={isEditMode} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" onChange={handleInputChange} placeholder={isEditMode ? "Leave blank to keep current password" : ""} required={!isEditMode} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Account Status</Label>
                                <Select value={formData.accountStatus} onValueChange={(value) => handleSelectChange('accountStatus', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="DISABLED">Disabled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user: <strong>{userToDelete?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}