// src/pages/LoginPage.jsx

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance'; // --- 1. Import axiosInstance ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated } = useAuthStore((state) => state);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // --- 2. เปลี่ยน axios.post เป็น axiosInstance.post และใช้ Relative Path ---
            const response = await axiosInstance.post('/auth/login', {
                username,
                password
            });
            
            const { token, user } = response.data;
            login(token, user);
            navigate('/dashboard');

        } catch (error) {
            console.error("Login failed:", error);
            const errorMessage = error.response?.data?.error || "Login failed. Please check your credentials.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your credentials to access the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Logging in...' : 'Login'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}