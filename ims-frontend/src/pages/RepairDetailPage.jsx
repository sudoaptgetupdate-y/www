// src/pages/RepairDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Wrench, Printer } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const RepairItemReturnDialog = ({ items, onReturn, repairId, repairStatus }) => {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemOutcomes, setItemOutcomes] = useState({});

    const handleSelect = (item) => {
        setSelectedItems(prev =>
            prev.some(i => i.inventoryItemId === item.inventoryItemId)
                ? prev.filter(i => i.inventoryItemId !== item.inventoryItemId)
                : [...prev, item]
        );
        if (!itemOutcomes[item.inventoryItemId]) {
            handleOutcomeChange(item.inventoryItemId, 'REPAIRED_SUCCESSFULLY');
        }
    };

    const handleOutcomeChange = (itemId, outcome) => {
        setItemOutcomes(prev => ({ ...prev, [itemId]: outcome }));
    };

    const handleReturn = async () => {
        if (selectedItems.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }

        const itemsToReturn = selectedItems.map(item => ({
            inventoryItemId: item.inventoryItemId,
            repairOutcome: itemOutcomes[item.inventoryItemId],
        }));

        try {
            await axiosInstance.post(`/repairs/${repairId}/return`, { itemsToReturn }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`${itemsToReturn.length} item(s) have been returned.`);
            onReturn();
            setIsOpen(false);
            setSelectedItems([]);
            setItemOutcomes({});
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to return items.");
        }
    };

    const unreturnedItems = items.filter(i => !i.returnedAt);

    return (
        <>
            <Button onClick={() => setIsOpen(true)} disabled={unreturnedItems.length === 0 || repairStatus === 'COMPLETED'}>
                {t('repairDetail_return_items')}
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t('repairDetail_return_items')}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>{t('tableHeader_productModel')}</TableHead>
                                    <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                    <TableHead>{t('repairDetail_outcome')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unreturnedItems.map(item => (
                                    <TableRow key={item.inventoryItemId}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.some(i => i.inventoryItemId === item.inventoryItemId)}
                                                onChange={() => handleSelect(item)}
                                                className="h-4 w-4"
                                            />
                                        </TableCell>
                                        <TableCell>{item.inventoryItem.productModel.modelNumber}</TableCell>
                                        <TableCell>{item.inventoryItem.serialNumber}</TableCell>
                                        <TableCell>
                                            <RadioGroup
                                                value={itemOutcomes[item.inventoryItemId] || ''}
                                                onValueChange={(value) => handleOutcomeChange(item.inventoryItemId, value)}
                                                disabled={!selectedItems.some(i => i.inventoryItemId === item.inventoryItemId)}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="REPAIRED_SUCCESSFULLY" id={`repaired-${item.inventoryItemId}`} />
                                                    <Label htmlFor={`repaired-${item.inventoryItemId}`}>{t('repairDetail_outcome_success')}</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="UNREPAIRABLE" id={`unrepairable-${item.inventoryItemId}`} />
                                                    <Label htmlFor={`unrepairable-${item.inventoryItemId}`}>{t('repairDetail_outcome_failed')}</Label>
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                        <Button onClick={handleReturn}>{t('confirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default function RepairDetailPage() {
    const { repairId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    const [repairOrder, setRepairOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRepairOrder = async () => {
        try {
            const response = await axiosInstance.get(`/repairs/${repairId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRepairOrder(response.data);
        } catch (error) {
            toast.error("Failed to fetch repair order details.");
            navigate('/repairs');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchRepairOrder();
    }, [repairId, token]);

    const getOwnerInfo = () => {
        if (!repairOrder) return "";
        if (repairOrder.customer) {
            return `(${repairOrder.customer.name})`;
        }
        if (repairOrder.items.length > 0) {
            const firstItemType = repairOrder.items[0].inventoryItem.itemType;
            if (firstItemType === 'ASSET') return `(${t('company_asset')})`;
            return `(${t('company_inventory')})`;
        }
        return "";
    };

    if (isLoading) return <div>Loading...</div>;
    if (!repairOrder) return <div>Repair order not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <Button variant="outline" onClick={() => navigate('/repairs')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('back_to_list')}
                </Button>
                <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> {t('print')}
                    </Button>
                    {canManage && <RepairItemReturnDialog items={repairOrder.items} onReturn={fetchRepairOrder} repairId={repairId} repairStatus={repairOrder.status} />}
                </div>
            </div>
            
            <div className="printable-area">
                <Card>
                    <CardHeader>
                        <div className="print-header hidden">
                            <h1 className="text-xl font-bold">
                                ใบส่งซ่อมสินค้า / Repair Order
                            </h1>
                        </div>
                        <div className="no-print">
                            <CardTitle className="flex items-center gap-3">
                                <Wrench className="h-6 w-6" />
                                <span>Repair Order #{repairOrder.id} {getOwnerInfo()}</span>
                            </CardTitle>
                            <CardDescription>{t('repairDetail_description')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="no-print">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>{t('repairDetail_status')}</Label>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={repairOrder.status} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('createRepair_sender_label')}</Label>
                                    <p className="font-medium whitespace-pre-wrap">{repairOrder.sender.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('createRepair_receiver_label')}</Label>
                                    <p className="font-medium whitespace-pre-wrap">{repairOrder.receiver.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('tableHeader_repairDate')}</Label>
                                    <p>{new Date(repairOrder.repairDate).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('tableHeader_createdBy')}</Label>
                                    <p>{repairOrder.createdBy.name}</p>
                                </div>
                                <div className="space-y-1 md:col-span-3">
                                    <Label>{t('createBorrowing_notes_label')}</Label>
                                    <p className="text-sm p-3 bg-muted rounded-md min-h-[50px] whitespace-pre-wrap">{repairOrder.notes || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="hidden print:block text-sm">
                             <div className="grid grid-cols-2 gap-x-8 border-t border-b py-4">
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">{t('repair_form_sender')}</p>
                                    <p className="font-bold">{repairOrder.sender.name}</p>
                                    <p className="whitespace-pre-wrap">{repairOrder.sender.address || 'N/A'}</p>
                                    <p>ผู้ติดต่อ: {repairOrder.sender.contactPerson || '-'}</p>
                                    <p>โทร: {repairOrder.sender.phone || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">{t('repair_form_receiver')}</p>
                                    <p className="font-bold">{repairOrder.receiver.name}</p>
                                    <p className="whitespace-pre-wrap">{repairOrder.receiver.address || 'N/A'}</p>
                                    <p>ผู้ติดต่อ: {repairOrder.receiver.contactPerson || '-'}</p>
                                    <p>โทร: {repairOrder.receiver.phone || '-'}</p>
                                </div>
                            </div>
                             <div className="mt-4 space-y-1">
                                <p><span className="font-semibold">Repair Order #{repairOrder.id} {getOwnerInfo()}</span></p>
                                <p><span className="text-muted-foreground">{t('tableHeader_repairDate')}:</span> <span className="font-semibold">{new Date(repairOrder.repairDate).toLocaleString()}</span></p>
                                <p><span className="text-muted-foreground">{t('tableHeader_createdBy')}:</span> <span className="font-semibold">{repairOrder.createdBy.name}</span></p>
                                {repairOrder.customer && <p><span className="text-muted-foreground">{t('tableHeader_customer')}:</span> <span className="font-semibold">{repairOrder.customer.name}</span></p>}
                            </div>
                            <div className="mt-4 space-y-1">
                                <Label className="text-muted-foreground">{t('createBorrowing_notes_label')}:</Label>
                                <p className="text-sm p-3 border rounded-md min-h-[40px] whitespace-pre-wrap">{repairOrder.notes || 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>{t('createSale_selected_items', { count: repairOrder.items.length })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('tableHeader_category')}</TableHead>
                                        <TableHead>{t('tableHeader_brand')}</TableHead>
                                        <TableHead>{t('tableHeader_productModel')}</TableHead>
                                        <TableHead>{t('tableHeader_assetCode')}</TableHead>
                                        <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                        <TableHead className="text-center">{t('repairDetail_returned')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {repairOrder.items.map(item => (
                                        <TableRow key={item.inventoryItemId}>
                                            <TableCell>{item.inventoryItem.productModel.category.name}</TableCell>
                                            <TableCell>{item.inventoryItem.productModel.brand.name}</TableCell>
                                            <TableCell>{item.inventoryItem.productModel.modelNumber}</TableCell>
                                            <TableCell>
                                                {item.inventoryItem.itemType === 'ASSET' ? item.inventoryItem.assetCode : 'N/A'}
                                            </TableCell>
                                            <TableCell>{item.inventoryItem.serialNumber}</TableCell>
                                            <TableCell className="text-center">
                                                {item.returnedAt ? <Check className="text-green-500 mx-auto" /> : <X className="text-red-500 mx-auto" />}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="signature-section hidden">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>({repairOrder.sender.contactPerson || '.....................................................'})</p>
                        <p>{t('print_sender_signature')}</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>({repairOrder.receiver.contactPerson || '.....................................................'})</p>
                        <p>{t('print_receiver_signature')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}