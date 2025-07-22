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
    ArrowRightLeft, CornerUpLeft, Wrench, ShieldCheck, Package, ShieldAlert 
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getStatusProperties } from "@/lib/statusUtils";

const eventConfig = {
    CREATE: { icon: <PlusCircle className="h-4 w-4" /> },
    UPDATE: { icon: <Edit className="h-4 w-4" /> },
    ASSIGN: { icon: <ArrowRightLeft className="h-4 w-4" /> },
    RETURN: { icon: <CornerUpLeft className="h-4 w-4" /> },
    DECOMMISSION: { icon: <ArchiveX className="h-4 w-4" /> },
    REINSTATE: { icon: <ArchiveRestore className="h-4 w-4" /> },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" /> },
    REPAIR_SUCCESS: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_FAILED: { icon: <ShieldAlert className="h-4 w-4" /> },
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
    
    // --- START: แก้ไขฟังก์ชันนี้ ---
    const getTransactionLink = (details) => {
        if (!details) return null;
        
        let assignmentMatch = details.match(/Assignment ID: (\d+)/);
        if (assignmentMatch && assignmentMatch[1]) {
            return `/asset-assignments/${assignmentMatch[1]}`;
        }

        let repairMatch = details.match(/Repair ID: (\d+)/);
        if (repairMatch && repairMatch[1]) {
            return `/repairs/${repairMatch[1]}`;
        }
        
        return null;
    };
    // --- END ---
    
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
                                const link = getTransactionLink(h.details);

                                const getDisplayInfo = (historyItem) => {
                                    if (historyItem.type === 'REPAIR_RETURNED') {
                                        if (historyItem.details.includes('REPAIRED_SUCCESSFULLY')) {
                                            return { status: 'REPAIR_SUCCESS' };
                                        }
                                        if (historyItem.details.includes('UNREPAIRABLE')) {
                                            return { status: 'REPAIR_FAILED' };
                                        }
                                    }
                                    return { status: historyItem.type };
                                };
                                
                                const { status: displayStatus } = getDisplayInfo(h);
                                const eventIcon = eventConfig[displayStatus]?.icon;
                                const { label: eventLabel } = getStatusProperties(displayStatus);

                                return (
                                    <tr key={h.id} className="border-b">
                                        <td className="p-2">{new Date(h.createdAt).toLocaleString()}</td>
                                        <td className="p-2">{h.details}</td>
                                        <td className="p-2">{h.user?.name || 'System'}</td>
                                        <td className="p-2 text-center">
                                            <StatusBadge
                                                status={displayStatus}
                                                className="w-36"
                                                {...(link && { onClick: () => navigate(link) })}
                                            >
                                                {eventIcon}
                                                <span className="ml-1.5">{eventLabel}</span>
                                            </StatusBadge>
                                        </td>
                                    </tr>
                                );
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