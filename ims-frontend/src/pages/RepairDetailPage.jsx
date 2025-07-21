// src/pages/RepairDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Printer, CheckSquare, Square, Wrench } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function RepairDetailPage() {
    const { repairId } = useParams();
    const navigate = useNavigate();
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
                isCustomerItem: item.inventoryItem.ownerType === 'CUSTOMER',
                displayName: item.inventoryItem.assetCode || item.inventoryItem.serialNumber || 'N/A'
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

    return (
        <div className="space-y-4 printable-area"> {/* <-- ลด space y */}
            <div className="flex justify-between items-center no-print">
                <Button variant="outline" onClick={() => navigate('/repairs')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                </Button>
                <div>
                    {itemsStillAtRepair.length > 0 && (
                        <Button onClick={() => setIsReturnDialogOpen(true)}>
                            <Wrench className="mr-2"/> Receive Items from Repair
                        </Button>
                    )}
                    <Button variant="outline" className="ml-2" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>
            </div>
            
            <div className="print-header hidden">
                <h1>ใบส่งซ่อมสินค้า / Repair Order</h1>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                        <div>
                            <CardTitle>Repair Order Details</CardTitle>
                            <CardDescription>Record ID: #{repairOrder.id}</CardDescription>
                        </div>
                        <div className="text-sm text-muted-foreground sm:text-right pt-1">
                            <p><strong>Date Sent:</strong> {new Date(repairOrder.repairDate).toLocaleString()}</p>
                            <p><strong>Created By:</strong> {repairOrder.createdBy.name}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-2"> {/* <-- ลด padding top */}
                     <div className="grid md:grid-cols-2 gap-4 text-sm"> {/* <-- ลด gap */}
                        <div className="space-y-1 rounded-lg border p-3"> {/* <-- ลด space y และ padding */}
                            <p className="font-semibold text-base">From (Sender):</p>
                            <p className="font-bold text-lg">{repairOrder.sender.name}</p>
                            <p><strong>Contact:</strong> {repairOrder.sender.contactPerson || '-'}</p>
                            <p><strong>Phone:</strong> {repairOrder.sender.phone || '-'}</p>
                            <p><strong>Address:</strong> {repairOrder.sender.address || '-'}</p>
                        </div>
                        <div className="space-y-1 rounded-lg border p-3"> {/* <-- ลด space y และ padding */}
                            <p className="font-semibold text-base">To (Receiver):</p>
                            <p className="font-bold text-lg">{repairOrder.receiver.name}</p>
                            <p><strong>Contact:</strong> {repairOrder.receiver.contactPerson || '-'}</p>
                            <p><strong>Phone:</strong> {repairOrder.receiver.phone || '-'}</p>
                            <p><strong>Address:</strong> {repairOrder.receiver.address || '-'}</p>
                        </div>
                    </div>
                    <Separator className="my-3"/> {/* <-- ลด margin y */}
                    <div>
                        <p className="font-semibold">Notes / Problem Description:</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">{repairOrder.notes || 'N/A'}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Items Sent for Repair ({repairOrder.items.length})</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead><tr className="border-b">
                            <th className="p-2 text-left">Identifier</th>
                            <th className="p-2 text-left">Product Model</th>
                            <th className="p-2 text-left">MAC Address</th>
                            <th className="p-2 text-left">Owner</th>
                            <th className="p-2 text-left">Status</th>
                        </tr></thead>
                        <tbody>
                            {repairOrder.items.map(item => (
                                <tr key={item.inventoryItemId} className="border-b">
                                    <td className="p-2">{item.inventoryItem.assetCode || item.inventoryItem.serialNumber}</td>
                                    <td className="p-2">{item.inventoryItem.productModel.modelNumber}</td>
                                    <td className="p-2">{item.inventoryItem.macAddress || 'N/A'}</td>
                                    <td className="p-2"><Badge variant={item.inventoryItem.ownerType === 'CUSTOMER' ? 'outline' : 'secondary'}>{item.inventoryItem.ownerType}</Badge></td>
                                    <td className="p-2">
                                        {item.returnedAt ? (
                                            <Badge variant={item.repairOutcome === 'REPAIRED_SUCCESSFULLY' ? 'success' : 'destructive'}>
                                                Returned ({item.repairOutcome.replace(/_/g, ' ')})
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning">Repairing</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Receive Items from Repair</DialogTitle></DialogHeader>
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
                                            <Label>Repair Outcome</Label>
                                            <RadioGroup onValueChange={(value) => handleOutcomeChange(item.inventoryItemId, value)} value={item.repairOutcome}>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="REPAIRED_SUCCESSFULLY" id={`success-${item.inventoryItemId}`} />
                                                    <Label htmlFor={`success-${item.inventoryItemId}`}>Repaired Successfully</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="UNREPAIRABLE" id={`fail-${item.inventoryItemId}`} />
                                                    <Label htmlFor={`fail-${item.inventoryItemId}`}>Unrepairable / Repair Failed</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button onClick={handleConfirmReturn}>Confirm Return</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <div className="signature-section hidden">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <p>( ..................................................... )</p>
                    <p>ผู้ส่งมอบสินค้า</p>
                </div>
            </div>
        </div>
    );
}