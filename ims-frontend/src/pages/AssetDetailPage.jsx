// src/pages/AssetDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// --- START: 1. Import ไอคอน ---
import { ArrowLeft, Edit, CornerUpLeft, Archive, User, Calendar, Hash, Package } from "lucide-react";
// --- END ---
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

export default function AssetDetailPage() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [asset, setAsset] = useState(null);
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!assetId || !token) return;
        try {
            setLoading(true);
            const [assetRes, historyRes, summaryRes] = await Promise.all([
                axiosInstance.get(`/assets/${assetId}`, { headers: { Authorization: `Bearer ${token}` } }),
                axiosInstance.get(`/assets/${assetId}/history`, { headers: { Authorization: `Bearer ${token}` } }),
                axiosInstance.get(`/assets/${assetId}/summary`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAsset(assetRes.data);
            setHistory(historyRes.data);
            setSummary(summaryRes.data);
        } catch (error) {
            toast.error("Failed to fetch asset details.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [assetId, token]);

    const handleAction = async (actionType) => {
        try {
            await axiosInstance.patch(`/assets/${assetId}/${actionType}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Asset action successful.`);
            fetchData(); // Refresh all data
        } catch (error) {
            toast.error(`Failed to ${actionType} asset.`);
        }
    };
    
    const getStatusVariant = (status) => {
        switch (status) {
            case 'IN_WAREHOUSE': return 'success';
            case 'ASSIGNED': return 'warning';
            case 'DECOMMISSIONED': return 'secondary';
            case 'DEFECTIVE': return 'destructive';
            default: return 'outline';
        }
    };

    if (loading || !asset || !summary) return <p>Loading asset details...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* --- START: 2. ปรับปรุง Header --- */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        Asset Details
                    </h1>
                    <p className="text-muted-foreground mt-1">Asset Code: {asset.assetCode}</p>
                </div>
                {/* --- END --- */}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/assets')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Button>
                     <Button variant="outline" onClick={() => navigate(`/assets/edit/${asset.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title="Current Status"
                    value={<Badge variant={getStatusVariant(asset.status)}>{asset.status}</Badge>}
                    icon={<User className="h-4 w-4 text-muted-foreground" />}
                    description={asset.assignedTo ? `Assigned to ${asset.assignedTo.name}`: "Available in warehouse"}
                />
                <StatCard 
                    title="Total Assignments"
                    value={summary.totalAssignments}
                    icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                    description="How many times this asset has been assigned."
                />
                 <StatCard 
                    title="Last Assigned Date"
                    value={summary.lastAssignedDate ? new Date(summary.lastAssignedDate).toLocaleDateString() : 'N/A'}
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                    description="The most recent assignment date."
                />
            </div>
            
            <div className="flex gap-4">
                {asset.status === 'ASSIGNED' && (
                    <Button onClick={() => handleAction('return')}><CornerUpLeft className="mr-2 h-4 w-4" />Return to Warehouse</Button>
                )}
                {asset.status === 'IN_WAREHOUSE' && (
                    <Button variant="destructive" onClick={() => handleAction('decommission')}><Archive className="mr-2 h-4 w-4" />Decommission</Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assignment History</CardTitle>
                    <CardDescription>A log of who has been assigned this asset.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* --- START: 3. เพิ่ม Div ครอบ Table และปรับปรุง Header --- */}
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-left">Assigned To</th>
                                    <th className="p-2 text-left">Assigned Date</th>
                                    <th className="p-2 text-left">Returned Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map(h => (
                                    <tr key={h.id} className="border-b">
                                        <td className="p-2">{h.assignedTo.name}</td>
                                        <td className="p-2">{new Date(h.assignedAt).toLocaleString()}</td>
                                        <td className="p-2">{h.returnedAt ? new Date(h.returnedAt).toLocaleString() : <span className="italic text-muted-foreground">In Possession</span>}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="p-4 text-center text-muted-foreground">No assignment history.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* --- END --- */}
                </CardContent>
            </Card>
        </div>
    );
}
