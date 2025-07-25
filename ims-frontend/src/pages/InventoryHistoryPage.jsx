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
import { getStatusProperties } from "@/lib/statusUtils";
import { useTranslation } from "react-i18next";

const eventConfig = {
    CREATE: { icon: <PlusCircle className="h-4 w-4" /> },
    UPDATE: { icon: <Edit className="h-4 w-4" /> },
    SALE: { icon: <ShoppingCart className="h-4 w-4" /> },
    VOID: { icon: <ArchiveX className="h-4 w-4" /> },
    BORROW: { icon: <ArrowRightLeft className="h-4 w-4" /> },
    RETURN_FROM_BORROW: { icon: <CornerUpLeft className="h-4 w-4" /> },
    ASSIGN: { icon: <ArrowRightLeft className="h-4 w-4" /> },
    RETURN_FROM_ASSIGN: { icon: <CornerUpLeft className="h-4 w-4" /> },
    DECOMMISSION: { icon: <ArchiveX className="h-4 w-4" /> },
    REINSTATE: { icon: <ArchiveRestore className="h-4 w-4" /> },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" /> },
    REPAIR_RETURNED: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_SUCCESS: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_FAILED: { icon: <ShieldAlert className="h-4 w-4" /> },
};


export default function InventoryHistoryPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [itemDetails, setItemDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!itemId || !token) return;
            try {
                const response = await axiosInstance.get(`/history/${itemId}`, {
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

    const getTransactionLink = (eventType, details) => {
        if (!details) return null;
        switch (eventType) {
            case 'SALE':
            case 'VOID':
                return `/sales/${details.saleId}`;
            case 'BORROW':
            case 'RETURN_FROM_BORROW':
                return `/borrowings/${details.borrowingId}`;
            case 'REPAIR_SENT':
            case 'REPAIR_RETURNED':
                return `/repairs/${details.repairId}`;
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
                        <Package className="h-6 w-6" /> {t('item_history_title')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('item_history_description', { 
                            modelNumber: itemDetails.productModel.modelNumber, 
                            serialNumber: itemDetails.serialNumber || 'N/A' 
                        })}
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/inventory')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('item_history_back_button')}
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t('item_history_log_title')}</CardTitle>
                    <CardDescription>{t('item_history_log_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-left">{t('tableHeader_date')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_details')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_handledBy')}</th>
                                    <th className="p-2 text-center w-40">{t('tableHeader_event')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map((event) => {
                                    const link = getTransactionLink(event.eventType, event.details);
                                    
                                    const getDisplayInfo = (historyEvent) => {
                                        if (historyEvent.eventType === 'REPAIR_RETURNED') {
                                            if (historyEvent.details.outcome === 'REPAIRED_SUCCESSFULLY') {
                                                return { status: 'REPAIR_SUCCESS' };
                                            }
                                            if (historyEvent.details.outcome === 'UNREPAIRABLE') {
                                                return { status: 'REPAIR_FAILED' };
                                            }
                                        }
                                        return { status: historyEvent.eventType };
                                    };

                                    const { status: displayStatus } = getDisplayInfo(event);
                                    const eventIcon = eventConfig[displayStatus]?.icon;
                                    const { label: eventLabel } = getStatusProperties(displayStatus);

                                    return (
                                    <tr key={event.id} className="border-b">
                                        <td className="p-2">{new Date(event.createdAt).toLocaleString()}</td>
                                        <td className="p-2" title={event.details?.details || 'N/A'}>
                                            {event.details?.details || 'N/A'}
                                        </td>
                                        <td className="p-2">{event.user?.name || 'System'}</td>
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
                                )}) : (
                                    <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">{t('item_history_no_history')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}