// src/pages/UserManagementPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { UserPlus, Edit, Trash2, MoreHorizontal, Package, ShieldOff, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <td className="p-2 text-center"><div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
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
    const currentUser = useAuthStore((state) => state.user);
    const {
        data: users, pagination, isLoading, searchTerm, handleSearchChange, handlePageChange, handleItemsPerPageChange, refreshData
    } = usePaginatedFetch("/users", 10);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userToToggleStatus, setUserToToggleStatus] = useState(null);
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
        if (isEditMode) {
            // ไม่ส่ง password ถ้าไม่ได้กรอก
            if (!payload.password) {
                delete payload.password;
            }
             // ไม่ส่ง username เพราะถูก disable ไว้
            delete payload.username;
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
    
    const confirmToggleStatus = async () => {
        if (!userToToggleStatus) return;
        const newStatus = userToToggleStatus.accountStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            await axiosInstance.patch(`/users/${userToToggleStatus.id}/status`, 
                { accountStatus: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`User status changed to ${newStatus}.`);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update user status.");
        } finally {
            setUserToToggleStatus(null);
        }
    }


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
                                    <td className="p-2 text-center">
                                       <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigate(`/users/${user.id}/assets`)}>
                                                    <Package className="mr-2 h-4 w-4" /> View Assets
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDialog(user)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit User
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                 {user.id !== currentUser.id && (
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setUserToToggleStatus(user)}>
                                                        {user.accountStatus === 'ACTIVE' ? 
                                                            <><ShieldOff className="mr-2 h-4 w-4 text-red-500"/> <span className="text-red-500">Disable</span></> : 
                                                            <><ShieldCheck className="mr-2 h-4 w-4 text-green-500"/> <span className="text-green-500">Enable</span></>
                                                        }
                                                    </DropdownMenuItem>
                                                 )}
                                                {user.id !== currentUser.id && (
                                                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setUserToDelete(user)} className="text-red-600 focus:text-red-500">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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

            {/* --- START: Alert Dialogs --- */}
             <AlertDialog open={!!userToToggleStatus} onOpenChange={(isOpen) => !isOpen && setUserToToggleStatus(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will {userToToggleStatus?.accountStatus === 'ACTIVE' ? 'disable' : 'enable'} the account for <strong>{userToToggleStatus?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmToggleStatus}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user: <strong>{userToDelete?.name}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Delete User</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* --- END: Alert Dialogs --- */}
        </Card>
    );
}