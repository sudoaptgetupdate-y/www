// src/pages/AssetHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, User, CornerUpLeft, Wrench, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const eventConfig = {
    ASSIGN: { icon: <User className="h-4 w-4" />, label: 'Assigned', variant: 'warning' },
    RETURN: { icon: <CornerUpLeft className="h-4 w-4" />, label: 'Returned', variant: 'info' },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" />, label: 'Sent to Repair', variant: 'info' },
    REPAIR_RETURNED: { icon: <ShieldCheck className="h-4 w-4" />, label: 'Repair Return', variant: 'success' },
};

export default function AssetHistoryPage() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [asset, setAsset] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!assetId || !token) return;
            try {
                const [assetRes, historyRes] = await Promise.all([
                    axiosInstance.get(`/assets/${assetId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/assets/${assetId}/history`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setAsset(assetRes.data);
                setHistory(historyRes.data);
            } catch (error) {
                toast.error("Failed to fetch asset history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [assetId, token]);

    const getTransactionLink = (type, id) => {
        switch (type) {
            case 'ASSIGNMENT':
                return `/asset-assignments/${id}`;
            case 'REPAIR':
                return `/repairs/${id}`;
            default:
                return '#';
        }
    };

    if (loading) return <p>Loading history...</p>;
    if (!asset) return <p>Asset not found.</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Asset History</h1>
                    <p className="text-muted-foreground">For Asset: {asset.assetCode} ({asset.productModel.modelNumber})</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/assets')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Assets
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>History Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Details</th>
                                <th className="p-2 text-left">Handled By</th>
                                <th className="p-2 text-center w-40">Event</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map((h, index) => {
                                const config = eventConfig[h.type] || { label: h.type, variant: 'secondary', icon: null };
                                return (
                                <tr key={index} className="border-b">
                                    <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                                    <td className="p-2">{h.details}</td>
                                    <td className="p-2">{h.user || '-'}</td>
                                    <td className="p-2 text-center">
                                         <Badge 
                                            variant={config.variant} 
                                            className="w-36 justify-center cursor-pointer"
                                            onClick={() => navigate(getTransactionLink(h.transactionType, h.transactionId))}
                                        >
                                            {config.icon}
                                            <span className="ml-1.5">{config.label}</span>
                                        </Badge>
                                    </td>
                                </tr>
                            )}) : (
                                <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No history found for this asset.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}