// src/pages/UserAssetHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Package, History, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StatCard = ({ title, value, icon, description }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function UserAssetHistoryPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !token) return;
            try {
                // --- START: ส่วนที่แก้ไข ---
                const [historyRes, summaryRes, userRes] = await Promise.all([
                    axiosInstance.get(`/users/${userId}/assets`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/users/${userId}/assets/summary`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setHistory(historyRes.data);
                setSummary(summaryRes.data);
                setUser(userRes.data);
                // --- END ---
            } catch (error) {
                toast.error("Failed to fetch user's asset history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, token]);

    if (loading || !summary) return <p>Loading asset history...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><User className="h-6 w-6" /> User Asset Details</h1>
                    <p className="text-muted-foreground">Showing asset history for: {user?.name || '...'}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/users')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to User List
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title="Currently Assigned"
                    value={summary.currentlyAssigned}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    description="Assets currently in possession."
                />
                <StatCard 
                    title="Total Ever Assigned"
                    value={summary.totalEverAssigned}
                    icon={<History className="h-4 w-4 text-muted-foreground" />}
                    description="Total number of assets ever assigned."
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assignment History Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Asset Code</th>
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2 text-left">Assigned Date</th>
                                <th className="p-2 text-left">Returned Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map(h => (
                                <tr key={h.id} className="border-b">
                                    <td className="p-2 font-semibold">{h.inventoryItem.assetCode}</td>
                                    <td className="p-2">{h.inventoryItem.productModel.modelNumber}</td>
                                    <td className="p-2">{new Date(h.assignedAt).toLocaleString()}</td>
                                    <td className="p-2">{h.returnedAt ? new Date(h.returnedAt).toLocaleString() : <Badge variant="warning">In Possession</Badge>}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">This user has no assignment history.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}