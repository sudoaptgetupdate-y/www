// src/pages/UserActiveAssetsPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// --- START: 1. Import ไอคอน ---
import { ArrowLeft, Package } from "lucide-react";
// --- END ---

export default function UserActiveAssetsPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [assets, setAssets] = useState([]);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !token) return;
            try {
                setLoading(true);
                const [assetsRes, userRes] = await Promise.all([
                    axiosInstance.get(`/users/${userId}/active-assets`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setAssets(assetsRes.data);
                setUserName(userRes.data.name);
            } catch (error) {
                toast.error("Failed to fetch active assets.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, token]);

    if (loading) return <p>Loading active assets...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* --- START: 2. ปรับปรุง Header --- */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        Currently Assigned Assets
                    </h1>
                    <p className="text-muted-foreground mt-1">For User: {userName}</p>
                </div>
                {/* --- END --- */}
                <Button variant="outline" onClick={() => navigate(`/users/${userId}/assets`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Full History
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Active Assets ({assets.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* --- START: 3. เพิ่ม Div ครอบ Table และปรับปรุง Header --- */}
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-left">Asset Code</th>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Serial Number</th>
                                    <th className="p-2 text-left">Assigned On</th>
                                    <th className="p-2 text-left">From Assignment ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.assetCode}</td>
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                        <td className="p-2">{new Date(item.assignedDate).toLocaleDateString()}</td>
                                        <td className="p-2">#{item.assignmentId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* --- END --- */}
                </CardContent>
            </Card>
        </div>
    );
}
