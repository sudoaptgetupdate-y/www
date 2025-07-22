// src/pages/ProfilePage.jsx

import { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from "@/components/ui/StatusBadge"; // <-- Import

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

const MyAssetsTab = () => {
    const token = useAuthStore((state) => state.token);
    const [assets, setAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAssets = async () => {
            if (!token) return;
            try {
                const response = await axiosInstance.get('/users/me/assets', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAssets(response.data);
            } catch (error) {
                toast.error("Could not load your assets.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAssets();
    }, [token]);

    // --- ลบ getStatusVariant ---

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Assets</CardTitle>
                <CardDescription>List of company assets currently assigned to you.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Asset Code</th>
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2 text-left">Serial Number</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
                            ) : assets.length > 0 ? assets.map(asset => (
                                <tr key={asset.id} className="border-b">
                                    <td className="p-2 font-semibold">{asset.assetCode}</td>
                                    <td className="p-2">{asset.productModel.modelNumber}</td>
                                    <td className="p-2">{asset.serialNumber || 'N/A'}</td>
                                    <td className="p-2 text-center">
                                        <StatusBadge status={asset.status} className="w-24" />
                                    </td>
                                    <td className="p-2 text-center">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/assets/${asset.id}/history`)}>
                                            Details
                                        </Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">You have no assets assigned.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default function ProfilePage() {
    const { user, token, login } = useAuthStore();
    
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [isProfileLoading, setIsProfileLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setUsername(user.username || '');
            setEmail(user?.email || '');
        }
    }, [user]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsProfileLoading(true);
        try {
            const response = await axiosInstance.patch('/users/me/profile', 
                { name, username, email },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            login(token, response.data);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update profile.");
        } finally {
            setIsProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation do not match.");
            return;
        }
        if (newPassword.length < 6) {
             toast.error("New password must be at least 6 characters long.");
            return;
        }

        setIsPasswordLoading(true);
        try {
            const response = await axiosInstance.patch('/users/me/password', 
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(response.data.message);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to change password.");
        } finally {
            setIsPasswordLoading(false);
        }
    };

    return (
        <Tabs defaultValue="profile" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile Details</TabsTrigger>
                <TabsTrigger value="password">Change Password</TabsTrigger>
                <TabsTrigger value="assets">My Assets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>My Profile</CardTitle>
                        <CardDescription>View and update your personal information.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleProfileSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="role">Role</Label><Input id="role" value={user?.role || ''} disabled /></div>
                        </CardContent>
                        <CardFooter><Button type="submit" disabled={isProfileLoading}>{isProfileLoading ? 'Saving...' : 'Save Changes'}</Button></CardFooter>
                    </form>
                </Card>
            </TabsContent>

            <TabsContent value="password">
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Enter your current password and a new password.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handlePasswordSubmit}>
                        <CardContent className="space-y-4">
                             <div className="space-y-2"><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
                             <div className="space-y-2"><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
                             <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm New Password</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
                        </CardContent>
                        <CardFooter><Button type="submit" disabled={isPasswordLoading}>{isPasswordLoading ? 'Saving...' : 'Change Password'}</Button></CardFooter>
                    </form>
                </Card>
            </TabsContent>

            <TabsContent value="assets">
                <MyAssetsTab />
            </TabsContent>
        </Tabs>
    );
}