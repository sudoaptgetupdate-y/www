// src/pages/InventoryHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart, ArrowRightLeft, CornerUpLeft, Package, ArchiveX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// --- START: ส่วนที่แก้ไข ---
const eventIcons = {
    SALE: <ShoppingCart className="h-4 w-4 text-green-600" />,
    BORROW: <ArrowRightLeft className="h-4 w-4 text-orange-600" />,
    RETURN: <CornerUpLeft className="h-4 w-4 text-blue-600" />,
    VOID: <ArchiveX className="h-4 w-4 text-red-600" />,
};

const eventLabels = {
    SALE: 'Sold',
    BORROW: 'Borrowed',
    RETURN: 'Returned',
    VOID: 'Voided',
};

const eventColors = {
    SALE: 'success',
    BORROW: 'warning',
    RETURN: 'info',
    VOID: 'destructive',
};
// --- END: ส่วนที่แก้ไข ---


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
                                <th className="p-2 text-left w-24">Event</th>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Customer</th>
                                <th className="p-2 text-left">Handled By</th>
                                <th className="p-2 text-center">Reference ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map((h, index) => (
                                <tr key={index} className="border-b">
                                    <td className="p-2">
                                        <Badge variant={eventColors[h.type]} className="w-24 justify-center">
                                            {eventIcons[h.type]}
                                            <span className="ml-1.5">{eventLabels[h.type]}</span>
                                        </Badge>
                                    </td>
                                    <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                                    <td className="p-2">{h.customer || '-'}</td>
                                    <td className="p-2">{h.user || '-'}</td>
                                    <td className="p-2 text-center">
                                        <Button 
                                            variant="link" 
                                            className="h-auto p-0"
                                            onClick={() => navigate(h.type === 'SALE' || h.type === 'VOID' ? `/sales/${h.transactionId}` : `/borrowings/${h.transactionId}`)}
                                        >
                                            #{h.transactionId}
                                        </Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No transaction history found for this item.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}