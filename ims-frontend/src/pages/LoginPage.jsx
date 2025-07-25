// src/pages/LoginPage.jsx

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Layers, Network } from 'lucide-react'; // --- 1. เพิ่มไอคอน Network ---

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const login = useAuthStore((state) => state.login);
    const token = useAuthStore((state) => state.token);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/login', {
                username,
                password
            });
            
            const { token, user } = response.data;
            login(token, user);
            toast.success(`Welcome back, ${user.name}!`);
            navigate('/dashboard');

        } catch (error)
        {
            console.error("Login failed:", error);
            const errorMessage = error.response?.data?.error || "Login failed. Please check your credentials.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (token) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-8">
                    <div className="grid gap-2 text-center">
                        <Layers className="mx-auto h-12 w-12 text-primary" />
                        <h1 className="text-3xl font-bold">Welcome Back</h1>
                        <p className="text-balance text-muted-foreground">
                            Enter your credentials to access the system
                        </p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input 
                                    id="username" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input 
                                    id="password" 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                />
                            </div>
                            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                                {isLoading ? 'Logging in...' : 'Login'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
            {/* --- START: แก้ไขโค้ดส่วนนี้ --- */}
            <div className="hidden bg-gradient-to-br from-slate-900 to-slate-800 lg:flex flex-col items-center justify-center p-8 text-white">
                 <div className="text-center">
                    <Network className="mx-auto h-24 w-24 text-slate-400" />
                    <h2 className="mt-6 text-4xl font-bold">
                        Inventory Management System
                    </h2>
                    <p className="mt-2 text-lg text-slate-400">
                        Streamline your business operations with ease.
                    </p>
                </div>
            </div>
            {/* --- END: จบส่วนที่แก้ไข --- */}
        </div>
    );
}