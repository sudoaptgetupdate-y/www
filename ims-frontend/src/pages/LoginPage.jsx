// src/pages/LoginPage.jsx

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Layers, Eye, EyeOff, Loader2 } from 'lucide-react'; 

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
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
            toast.success(`ยินดีต้อนรับคุณ ${user.name}!`);
            navigate('/dashboard');

        } catch (error) {
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
            <div className="flex items-center justify-center py-12 px-4">
                <Card className="mx-auto w-full max-w-sm">
                    <CardHeader className="text-center">
                        <Layers className="mx-auto h-10 w-10 text-primary" />
                        <CardTitle className="text-2xl font-bold mt-4">
                            Inventory Management
                        </CardTitle>
                        <CardDescription>
                            กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                        placeholder="ชื่อผู้ใช้ของคุณ"
                                    />
                                </div>
                                <div className="grid gap-2 relative">
                                    <Label htmlFor="password">Password</Label>
                                    <Input 
                                        id="password" 
                                        type={showPassword ? 'text' : 'password'}
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required
                                        placeholder="รหัสผ่าน"
                                        className="pr-10"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute bottom-1 right-1 h-7 w-7"
                                        onClick={() => setShowPassword(prev => !prev)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <div className="hidden lg:flex items-start p-12 relative overflow-hidden">
                <img 
                    src="/my-backgroud.jpg"
                    alt="Inventory Management System"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                
                <div className="relative z-10 text-left max-w-xl">
                    <h2 className="text-4xl font-bold tracking-tight text-blue-900 whitespace-nowrap">
                        ระบบบริหารจัดการคลังพัสดุและทรัพย์สิน
                    </h2>
                    <p className="mt-4 text-xl text-blue-800/90">
                        ศูนย์ขายและวิศวกรรมบริการ นครศรีธรรมราช
                    </p>
                    {/* --- START: ส่วนที่แก้ไข --- */}
                    <p className="mt-2 text-lg text-blue-700/80">
                        บริษัทโทรคมนาคมแห่งชาติ จำกัด (มหาชน)
                    </p>
                    {/* --- END: ส่วนที่แก้ไข --- */}
                </div>
            </div>
        </div>
    );
}