// src/pages/AssetHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge"; // <-- Import StatusBadge

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
                    <CardDescription>A complete log of events for this asset.</CardDescription>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Event</th>
                                <th className="p-2 text-left">Details</th>
                                <th className="p-2 text-left">Handled By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map((h) => (
                                <tr key={h.id} className="border-b">
                                    <td className="p-2">{new Date(h.createdAt).toLocaleString()}</td>
                                    <td className="p-2">
                                        <StatusBadge status={h.type} />
                                    </td>
                                    <td className="p-2">{h.details}</td>
                                    <td className="p-2">{h.user?.name || 'System'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No history found for this asset.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}