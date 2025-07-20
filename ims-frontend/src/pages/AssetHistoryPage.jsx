// src/pages/AssetHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

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
                // --- START: ส่วนที่แก้ไข ---
                const [assetRes, historyRes] = await Promise.all([
                    axiosInstance.get(`/assets/${assetId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/assets/${assetId}/history`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                // --- END: ส่วนที่แก้ไข ---
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
                    <h1 className="text-2xl font-bold">Assignment History</h1>
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
                                <th className="p-2 text-left">Assigned To</th>
                                <th className="p-2 text-left">Assigned Date</th>
                                <th className="p-2 text-left">Returned Date</th>
                                <th className="p-2 text-left">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map(h => (
                                <tr key={h.id} className="border-b">
                                    <td className="p-2">{h.assignedTo.name}</td>
                                    <td className="p-2">{new Date(h.assignedAt).toLocaleString()}</td>
                                    <td className="p-2">{h.returnedAt ? new Date(h.returnedAt).toLocaleString() : <span className="italic text-muted-foreground">In Possession</span>}</td>
                                    <td className="p-2 text-muted-foreground">{h.notes || '-'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No assignment history found for this asset.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}