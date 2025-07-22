// src/pages/AssetHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
    ArrowLeft, PlusCircle, Edit, ArchiveRestore, ArchiveX, 
    ArrowRightLeft, CornerUpLeft, Wrench, ShieldCheck, Package
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const eventConfig = {
    CREATE: { icon: <PlusCircle className="h-4 w-4" />, label: 'Created' },
    UPDATE: { icon: <Edit className="h-4 w-4" />, label: 'Updated' },
    ASSIGN: { icon: <ArrowRightLeft className="h-4 w-4" />, label: 'Assigned' },
    RETURN: { icon: <CornerUpLeft className="h-4 w-4" />, label: 'Returned' },
    DECOMMISSION: { icon: <ArchiveX className="h-4 w-4" />, label: 'Decommissioned' },
    REINSTATE: { icon: <ArchiveRestore className="h-4 w-4" />, label: 'Reinstated' },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" />, label: 'Repair Sent' },
    REPAIR_RETURNED: { icon: <ShieldCheck className="h-4 w-4" />, label: 'Repair Return' },
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

    // --- START: เพิ่มฟังก์ชันนี้ ---
    const getTransactionLink = (details) => {
        if (!details) return null;
        const match = details.match(/Assignment ID: (\d+)/);
        if (match && match[1]) {
            return `/asset-assignments/${match[1]}`;
        }
        return null;
    };
    // --- END: เพิ่มฟังก์ชันนี้ ---

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
                                <th className="p-2 text-left">Details</th>
                                <th className="p-2 text-left">Handled By</th>
                                <th className="p-2 text-center w-40">Event</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map((h) => {
                                // --- START: แก้ไขส่วนนี้ ---
                                const link = getTransactionLink(h.details);
                                const eventLabel = eventConfig[h.type]?.label || h.type.replace(/_/g, ' ');
                                const eventIcon = eventConfig[h.type]?.icon;

                                return (
                                    <tr key={h.id} className="border-b">
                                        <td className="p-2">{new Date(h.createdAt).toLocaleString()}</td>
                                        <td className="p-2">{h.details}</td>
                                        <td className="p-2">{h.user?.name || 'System'}</td>
                                        <td className="p-2 text-center">
                                            <StatusBadge
                                                status={h.type}
                                                className="w-36"
                                                {...(link && { onClick: () => navigate(link) })}
                                            >
                                                {eventIcon}
                                                <span className="ml-1.5">{eventLabel}</span>
                                            </StatusBadge>
                                        </td>
                                    </tr>
                                );
                                // --- END: แก้ไขส่วนนี้ ---
                            }) : (
                                <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No history found for this asset.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}