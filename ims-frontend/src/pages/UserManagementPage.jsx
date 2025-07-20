// src/pages/UserManagementPage.jsx
import { useState } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2">
            <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-28 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse"></div>
            </div>
        </td>
    </tr>
);

const initialFormData = { name: "", username: "", email: "", password: "", role: "EMPLOYEE" };

export default function UserManagementPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    
    const { 
        data: users, 
        pagination, 
        isLoading, 
        searchTerm,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        refreshData 
    } = usePaginatedFetch("/users");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });
    const handleSelectChange = (value) => setFormData({ ...formData, role: value });

    const openDialog = (user = null) => {
        if (user) {
            setIsEditMode(true);
            setEditingUserId(user.id);
            setFormData({ name: user.name, username: user.username, email: user.email, password: "", role: user.role });
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/users/${editingUserId}` : "/users";
        const method = isEditMode ? 'put' : 'post';
        
        const data = isEditMode 
            ? { name: formData.name, email: formData.email, role: formData.role, username: formData.username } 
            : formData;

        try {
            await axiosInstance[method](url, data, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`User ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Operation failed.");
        }
    };

    const confirmDelete = async () => {
        if(!userToDelete) return;
        try {
            await axiosInstance.delete(`/users/${userToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("User deleted successfully!");
            refreshData();
        } catch (error) { toast.error(error.response?.data?.error || "Failed to delete user."); }
        finally {
            setUserToDelete(null);
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.accountStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            await axiosInstance.patch(`/users/${user.id}/status`, { accountStatus: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`User status set to ${newStatus}.`);
            refreshData();
        } catch (error) { toast.error("Failed to update status."); }
    };
    
    const displayedUsers = users.filter(u => u.id !== currentUser.id);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Button onClick={() => openDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add User
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="mb-4">
                    <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2">Name</th>
                                <th className="p-2">Username</th>
                                <th className="p-2">Email</th>
                                <th className="p-2">Role</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : displayedUsers.map((user) => (
                                <tr key={user.id} className="border-b">
                                    <td className="p-2">{user.name}</td>
                                    <td className="p-2">{user.username}</td>
                                    <td className="p-2">{user.email}</td>
                                    <td className="p-2"><Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge></td>
                                    <td className="p-2 text-center">
                                        <Badge variant={user.accountStatus === 'ACTIVE' ? 'success' : 'destructive'} className="w-24 justify-center">
                                            {user.accountStatus}
                                        </Badge>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" size="sm" className="w-28" onClick={() => navigate(`/users/${user.id}/assets`)}>Asset History</Button>
                                            <Button
                                                variant={user.accountStatus === 'ACTIVE' ? 'primary-outline' : 'default'}
                                                size="sm"
                                                className="w-24"
                                                onClick={() => handleToggleStatus(user)}
                                            >
                                                {user.accountStatus === 'ACTIVE' ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button variant="outline" size="sm" className="w-20" onClick={() => openDialog(user)}>Edit</Button>
                                            <Button variant="destructive" size="sm" className="w-20" onClick={() => setUserToDelete(user)}>Delete</Button>
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
                    <DialogHeader><DialogTitle>{isEditMode ? 'Edit' : 'Add New'} User</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" value={formData.username} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input type="email" id="email" value={formData.email} onChange={handleInputChange} required />
                            </div>
                            {!isEditMode && (
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input type="password" id="password" value={formData.password} onChange={handleInputChange} required />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select onValueChange={handleSelectChange} value={formData.role}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>Delete user: <strong>{userToDelete?.name}</strong></AlertDialogDescription>
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