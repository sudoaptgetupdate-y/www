// src/pages/InventoryHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
    ArrowLeft, ShoppingCart, ArrowRightLeft, CornerUpLeft, Package, 
    ArchiveX, Wrench, ShieldCheck, History as HistoryIcon, PlusCircle, Edit, ArchiveRestore, ShieldAlert
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const eventConfig = {
    SALE: { icon: <ShoppingCart className="h-4 w-4" /> },
    VOID: { icon: <ArchiveX className="h-4 w-4" /> },
    BORROW: { icon: <ArrowRightLeft className="h-4 w-4" /> },
    RETURN: { icon: <CornerUpLeft className="h-4 w-4" /> },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" /> },
    REPAIR_RETURNED: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_SUCCESS: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_FAILED: { icon: <ShieldAlert className="h-4 w-4" /> },
    CREATE: { icon: <PlusCircle className="h-4 w-4" /> },
    UPDATE: { icon: <Edit className="h-4 w-4" /> },
    DECOMMISSION: { icon: <ArchiveX className="h-4 w-4" /> },
    REINSTATE: { icon: <ArchiveRestore className="h-4 w-4" /> },
    DEFECTIVE: { icon: <ShieldAlert className="h-4 w-4" /> },
    IN_STOCK: { icon: <ShieldCheck className="h-4 w-4" /> },
    RESERVED: { icon: <ArchiveRestore className="h-4 w-4" /> }
};

export default function InventoryHistoryPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [itemDetails, setItemDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!itemId || !token) return;
            try {
                const response = await axiosInstance.get(`/inventory/${itemId}/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setItemDetails(response.data.itemDetails);
                setHistory(response.data.history);
            } catch (error) {
                toast.error("Failed to fetch item history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [itemId, token]);

    const getTransactionLink = (type, id) => {
        switch (type) {
            case 'SALE':
            case 'VOID':
                return `/sales/${id}`;
            case 'BORROWING':
            case 'BORROW':
                return `/borrowings/${id}`;
            case 'REPAIR':
                return `/repairs/${id}`;
            default:
                return null;
        }
    };

    if (loading) return <p>Loading history...</p>;
    if (!itemDetails) return <p>Item not found.</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" /> Item History
                    </h1>
                    <p className="text-muted-foreground">
                        Tracking history for: {itemDetails.productModel.modelNumber} (S/N: {itemDetails.serialNumber || 'N/A'})
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/inventory')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inventory
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Log</CardTitle>
                    <CardDescription>A complete chronological history of this item.</CardDescription>
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
                                const link = h.transactionId ? getTransactionLink(h.transactionType, h.transactionId) : null;
                                
                                const getDisplayInfo = (historyItem) => {
                                    if (historyItem.type === 'REPAIR_RETURNED') {
                                        if (historyItem.details.includes('Success')) {
                                            return { status: 'REPAIR_SUCCESS', icon: eventConfig.REPAIR_SUCCESS.icon };
                                        }
                                        if (historyItem.details.includes('Failed')) {
                                            return { status: 'REPAIR_FAILED', icon: eventConfig.REPAIR_FAILED.icon };
                                        }
                                    }
                                    
                                    let status = historyItem.type;
                                    if (historyItem.type === 'UPDATE') {
                                        const details = historyItem.details.toLowerCase();
                                        if (details.includes('sold to')) status = 'SALE';
                                        else if (details.includes('voided')) status = 'VOID';
                                        else if (details.includes('marked as defective')) status = 'DEFECTIVE';
                                        else if (details.includes('returned to stock from defective')) status = 'IN_STOCK';
                                        else if (details.includes('marked as reserved')) status = 'RESERVED';
                                        else if (details.includes('unreserved and returned to stock')) status = 'IN_STOCK';
                                    }
                                    return { status, icon: eventConfig[status]?.icon };
                                };

                                const { status: displayStatus, icon: eventIcon } = getDisplayInfo(h);

                                return (
                                <tr key={index} className="border-b">
                                    <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                                    <td className="p-2">{h.details}</td>
                                    <td className="p-2">{h.user || '-'}</td>
                                    <td className="p-2 text-center">
                                         <StatusBadge
                                            status={displayStatus}
                                            className="w-36"
                                            {...(link && { onClick: () => navigate(link) })}
                                        >
                                            {eventIcon}
                                            <span className="ml-1.5">{displayStatus.replace(/_/g, ' ')}</span>
                                        </StatusBadge>
                                    </td>
                                </tr>
                            )}) : (
                                <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No transaction history found for this item.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}