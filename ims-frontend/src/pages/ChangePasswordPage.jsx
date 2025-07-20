// src/pages/ChangePasswordPage.jsx

import { useState } from 'react';
import useAuthStore from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import { useNavigate } from 'react-router-dom';

export default function ChangePasswordPage() {
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Client-side validation
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation do not match.");
            return;
        }
        if (newPassword.length < 6) {
             toast.error("New password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosInstance.patch('/users/me/password', 
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(response.data.message);
            navigate('/profile'); // กลับไปหน้า Profile หลังเปลี่ยนสำเร็จ

        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to change password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Enter your current password and a new password.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input 
                                id="currentPassword" 
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input 
                                id="newPassword" 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input 
                                id="confirmPassword" 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Change Password'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}