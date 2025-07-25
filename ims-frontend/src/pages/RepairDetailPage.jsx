// src/pages/RepairDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Printer, CheckSquare, Square, Wrench } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";


export default function RepairDetailPage() {
    const { repairId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [repairOrder, setRepairOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [itemsToReturn, setItemsToReturn] = useState([]);

    const fetchDetails = async () => {
        if (!repairId || !token) return;
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/repairs/${repairId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRepairOrder(response.data);
            const notReturned = response.data.items.filter(i => !i.returnedAt);
            setItemsToReturn(notReturned.map(item => ({
                inventoryItemId: item.inventoryItemId,
                repairOutcome: null,
                isSelected: false,
                isCustomerItem: item.inventoryItem?.ownerType === 'CUSTOMER' || item.inventoryItem?.saleId !== null,
                displayName: item.inventoryItem?.assetCode || item.inventoryItem?.serialNumber || 'N/A'
            })));
        } catch (error) {
            toast.error("Failed to fetch repair order details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [repairId, token]);

    const handleToggleSelectItem = (id) => {
        setItemsToReturn(itemsToReturn.map(item =>
            item.inventoryItemId === id ? { ...item, isSelected: !item.isSelected, repairOutcome: !item.isSelected ? (item.isCustomerItem ? 'REPAIRED_SUCCESSFULLY' : null) : null } : item
        ));
    };

    const handleOutcomeChange = (id, outcome) => {
        setItemsToReturn(itemsToReturn.map(item =>
            item.inventoryItemId === id ? { ...item, repairOutcome: outcome } : item
        ));
    };

    const handleConfirmReturn = async () => {
        const selectedItems = itemsToReturn.filter(item => item.isSelected);
        if (selectedItems.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }
        if (selectedItems.some(item => !item.repairOutcome)) {
            toast.error("Please specify the repair outcome for all selected items.");
            return;
        }

        const payload = {
            itemsToReturn: selectedItems.map(({ inventoryItemId, repairOutcome }) => ({
                inventoryItemId,
                repairOutcome
            }))
        };
        
        try {
            await axiosInstance.patch(`/repairs/${repairId}/return`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Items have been returned successfully!");
            setIsReturnDialogOpen(false);
            fetchDetails();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading) return <p>Loading details...</p>;
    if (!repairOrder) return <p>Record not found.</p>;
    
    const itemsStillAtRepair = repairOrder.items.filter(i => !i.returnedAt);
    const formattedRepairId = repairOrder.id.toString().padStart(6, '0');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold">{t('repair_detail_title')}</h1>
                    <p className="text-muted-foreground">{t('repair_detail_description', { id: formattedRepairId })}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t('repair_detail_back_button')}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> {t('repair_detail_print_button')}
                    </Button>
                    {itemsStillAtRepair.length > 0 && (
                        <Button onClick={() => setIsReturnDialogOpen(true)}>
                            <Wrench className="mr-2"/> {t('repair_detail_receive_button')}
                        </Button>
                    )}
                </div>
            </div>
            
            <Card className="printable-area p-4 sm:p-6 md:p-8 font-sarabun">
                <div className="print-header hidden">
                    <h1 className="text-xl font-bold">{t('print_header_title')}</h1>
                </div>

                <CardHeader className="p-0 mb-6">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-lg font-semibold">{t('repairOrders')}</p>
                            <p className="text-sm"><strong>{t('repair_form_id')}</strong> #{formattedRepairId}</p>
                            <p className="text-sm"><strong>{t('repair_form_date_sent')}</strong> {new Date(repairOrder.repairDate).toLocaleString('th-TH')}</p>
                            <p className="text-sm"><strong>{t('repair_form_created_by')}</strong> {repairOrder.createdBy?.name || 'N/A'}</p>
                        </div>
                        <div className="text-right no-print">
                            <StatusBadge status={repairOrder.status} className="w-32 text-base" />
                        </div>
                    </div>
                    
                     <div className="grid md:grid-cols-2 gap-6 text-sm border-t border-b py-4">
                        <div className="space-y-1">
                            <p className="text-muted-foreground font-semibold">{t('repair_form_sender')}</p>
                            <p className="font-bold text-base">{repairOrder.sender?.name || 'N/A'}</p>
                            <p>{repairOrder.sender?.contactPerson || '-'}</p>
                            <p>โทร. {repairOrder.sender?.phone || '-'}</p>
                            <p>{repairOrder.sender?.address || '-'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-muted-foreground font-semibold">{t('repair_form_receiver')}</p>
                            <p className="font-bold text-base">{repairOrder.receiver?.name || 'N/A'}</p>
                             <p>{repairOrder.receiver?.contactPerson || '-'}</p>
                            <p>โทร. {repairOrder.receiver?.phone || '-'}</p>
                            <p>{repairOrder.receiver?.address || '-'}</p>
                        </div>
                    </div>

                    {repairOrder.notes && (
                        <div className="mt-6">
                            <p className="font-semibold">{t('repair_form_notes')}</p>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground border p-3 rounded-md bg-muted/30 no-print">{repairOrder.notes}</p>
                            <p className="whitespace-pre-wrap text-sm print-block hidden">{repairOrder.notes}</p> {/* For printing */}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0 mt-6">
                    <p className="font-semibold mb-2 text-base">{t('repair_form_items_sent', { count: repairOrder.items.length })}</p>
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="p-2 text-left">{t('tableHeader_identifier')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_productModel')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_owner')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repairOrder.items.map(item => {
                                    const isSold = item.inventoryItem?.saleId !== null;
                                    const displayOwner = isSold ? 'CUSTOMER' : item.inventoryItem?.ownerType;

                                    return (
                                    <tr key={item.inventoryItemId} className="border-b">
                                        <td className="p-2 font-semibold">{item.inventoryItem?.assetCode || item.inventoryItem?.serialNumber || 'N/A'}</td>
                                        <td className="p-2">{item.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                        <td className="p-2">{item.inventoryItem?.serialNumber || 'N/A'}</td>
                                        <td className="p-2">
                                            <StatusBadge status={displayOwner} />
                                        </td>
                                        <td className="p-2">
                                            {item.returnedAt ? (
                                                <StatusBadge status={item.repairOutcome} />
                                            ) : (
                                                <StatusBadge status="REPAIRING" />
                                            )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            
                 <div className="signature-section hidden">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {repairOrder.createdBy?.name || '.....................................................'} )</p>
                        <p>{t('print_sender_signature')}</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( ..................................................... )</p>
                        <p>{t('print_receiver_signature')}</p>
                    </div>
                </div>
            </Card>

            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('receive_dialog_title')}</DialogTitle>
                        <DialogDescription>{t('receive_dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {itemsToReturn.map(item => (
                            <div key={item.inventoryItemId} className="flex items-start gap-4 border p-4 rounded-md">
                                <div onClick={() => handleToggleSelectItem(item.inventoryItemId)} className="cursor-pointer pt-1">
                                    {item.isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{item.displayName}</p>
                                    {item.isSelected && (
                                        <div className="mt-2 space-y-2">
                                            <Label>{t('receive_dialog_outcome_label')}</Label>
                                            <RadioGroup onValueChange={(value) => handleOutcomeChange(item.inventoryItemId, value)} value={item.repairOutcome}>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="REPAIRED_SUCCESSFULLY" id={`success-${item.inventoryItemId}`} />
                                                    <Label htmlFor={`success-${item.inventoryItemId}`}>{t('receive_dialog_outcome_success')}</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="UNREPAIRABLE" id={`fail-${item.inventoryItemId}`} />
                                                    <Label htmlFor={`fail-${item.inventoryItemId}`}>{t('receive_dialog_outcome_fail')}</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={itemsToReturn.filter(i => i.isSelected).length === 0}>{t('receive_dialog_confirm_button')}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('receive_dialog_alert_title')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('receive_dialog_alert_description')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirmReturn}>{t('continue')}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}