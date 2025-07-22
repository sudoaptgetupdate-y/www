// src/pages/InventoryHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// --- START: แก้ไขบรรทัดนี้ ---
import { 
    ArrowLeft, ShoppingCart, ArrowRightLeft, CornerUpLeft, Package, 
    ArchiveX, Wrench, ShieldCheck, History as HistoryIcon, PlusCircle, Edit, ArchiveRestore 
} from "lucide-react";
// --- END: แก้ไขบรรทัดนี้ ---
import { StatusBadge } from "@/components/ui/StatusBadge";

const eventConfig = {
    SALE: { icon: <ShoppingCart className="h-4 w-4" />, label: 'Sold', variant: 'success' },
    VOID: { icon: <ArchiveX className="h-4 w-4" />, label: 'Voided', variant: 'destructive' },
    BORROW: { icon: <ArrowRightLeft className="h-4 w-4" />, label: 'Borrowed', variant: 'warning' },
    RETURN: { icon: <CornerUpLeft className="h-4 w-4" />, label: 'Returned', variant: 'success' },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" />, label: 'Repair Sent', variant: 'info' },
    REPAIR_RETURNED: { icon: <ShieldCheck className="h-4 w-4" />, label: 'Repair Return', variant: 'success' },
    CREATE: { icon: <PlusCircle className="h-4 w-4" />, label: 'Created', variant: 'success' },
    UPDATE: { icon: <Edit className="h-4 w-4" />, label: 'Updated', variant: 'info' },
    DECOMMISSION: { icon: <ArchiveX className="h-4 w-4" />, label: 'Decommissioned', variant: 'destructive' },
    REINSTATE: { icon: <ArchiveRestore className="h-4 w-4" />, label: 'Reinstated', variant: 'success' },
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
                                const eventLabel = eventConfig[h.type]?.label || h.type.replace(/_/g, ' ');

                                return (
                                <tr key={index} className="border-b">
                                    <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                                    <td className="p-2">{h.details}</td>
                                    <td className="p-2">{h.user || '-'}</td>
                                    <td className="p-2 text-center">
                                         <StatusBadge
                                            status={h.type}
                                            className="w-36"
                                            {...(link && { onClick: () => navigate(link) })}
                                        >
                                            {eventConfig[h.type]?.icon}
                                            <span className="ml-1.5">{eventLabel}</span>
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