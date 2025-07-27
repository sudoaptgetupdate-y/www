// src/pages/BorrowingDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Square, Printer, CornerDownLeft, ArrowRightLeft } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function BorrowingDetailPage() {
    const { borrowingId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [borrowing, setBorrowing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedToReturn, setSelectedToReturn] = useState([]);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

    const fetchDetails = async () => {
        if (!borrowingId || !token) return;
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/borrowings/${borrowingId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBorrowing(response.data);
        }
        catch (error)
        {
            toast.error("Failed to fetch borrowing details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [borrowingId, token]);

    const handleToggleReturnItem = (itemId) => {
        setSelectedToReturn(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const handleReturnItems = async () => {
        if (selectedToReturn.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }
        try {
            await axiosInstance.patch(`/borrowings/${borrowingId}/return`,
                { itemIdsToReturn: selectedToReturn },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Items have been returned successfully.");
            setIsReturnDialogOpen(false);
            fetchDetails();
            setSelectedToReturn([]);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading) return <p>Loading details...</p>;
    if (!borrowing) return <p>Record not found.</p>;

    const itemsToReturn = borrowing.items.filter(item => !item.returnedAt && item.inventoryItem);
    const formattedBorrowingId = borrowing.id.toString().padStart(6, '0');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
                 <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ArrowRightLeft className="h-6 w-6" />
                        Borrowing Details
                    </h1>
                    <p className="text-muted-foreground">Viewing details for Borrowing ID #{formattedBorrowingId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Button>
                     <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / PDF
                    </Button>
                    {itemsToReturn.length > 0 && (
                        <Button onClick={() => setIsReturnDialogOpen(true)}>
                            <CornerDownLeft className="mr-2"/> Receive Returned Items
                        </Button>
                    )}
                </div>
            </div>

            <Card className="printable-area p-4 sm:p-6 md:p-8 font-sarabun">
                <div className="print-header hidden">
                    <h1 className="text-xl font-bold">ใบยืม-คืนสินค้า / Borrowing Note</h1>
                </div>

                <CardHeader className="p-0 mb-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">ผู้ยืม (Borrower)</p>
                            <p className="font-semibold">{borrowing.customer?.name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{borrowing.customer?.address || "No address provided"}</p>
                            <p className="text-sm text-muted-foreground">โทร. {borrowing.customer?.phone || 'N/A'}</p>
                        </div>
                        <div className="space-y-1 text-right">
                             <p className="text-sm text-muted-foreground">เลขที่ (Record ID)</p>
                             <p className="font-semibold">#{formattedBorrowingId}</p>
                             <p className="text-sm text-muted-foreground">วันที่ยืม (Borrow Date)</p>
                             <p className="font-semibold">{new Date(borrowing.borrowDate).toLocaleString('th-TH')}</p>
                             <p className="text-sm text-muted-foreground">กำหนดคืน (Due Date)</p>
                             <p className="font-semibold">{borrowing.dueDate ? new Date(borrowing.dueDate).toLocaleDateString('th-TH') : 'N/A'}</p>
                             <p className="text-sm text-muted-foreground">ผู้อนุมัติ (Approved By)</p>
                             <p className="font-semibold">{borrowing.approvedBy?.name || 'N/A'}</p>
                        </div>
                    </div>
                     <div className="mt-4 flex justify-end no-print">
                        <StatusBadge status={borrowing.status} className="w-28 text-base" />
                    </div>
                     {borrowing.notes && (
                        <div className="mt-6">
                            <p className="font-semibold">หมายเหตุ (Notes):</p>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground border p-3 rounded-md bg-muted/30">{borrowing.notes}</p>
                        </div>
                    )}
                </CardHeader>
                
                <CardContent className="p-0 mt-6">
                     <p className="font-semibold mb-2 text-base">รายการที่ยืม ({borrowing.items.length})</p>
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-left">Brand</th>
                                    <th className="p-2 text-left">รุ่นสินค้า (Product Model)</th>
                                    <th className="p-2 text-left">Serial Number</th>
                                    <th className="p-2 text-left">MAC Address</th>
                                    <th className="p-2 text-left">สถานะ (Status)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {borrowing.items.map(boi => (
                                    <tr key={boi.inventoryItemId} className="border-b">
                                        <td className="p-2">{boi.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                        <td className="p-2">{boi.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
                                        <td className="p-2">{boi.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                        <td className="p-2">{boi.inventoryItem?.serialNumber || 'N/A'}</td>
                                        <td className="p-2">{boi.inventoryItem?.macAddress || 'N/A'}</td>
                                        <td className="p-2">
                                            <StatusBadge status={boi.returnedAt ? 'RETURNED' : 'BORROWED'} />
                                            {boi.returnedAt && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    (เมื่อ {new Date(boi.returnedAt).toLocaleDateString('th-TH')})
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                
                <div className="signature-section hidden">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {borrowing.approvedBy?.name || '.....................................................'} )</p>
                        <p>เจ้าหน้าที่</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {borrowing.customer?.name || '.....................................................'} )</p>
                        <p>ผู้ยืมสินค้า</p>
                    </div>
                </div>
            </Card>

            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Receive Returned Items</DialogTitle>
                        <DialogDescription>Select items that the customer is returning now.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                         <div className="border rounded-md">
                            <table className="w-full text-sm">
                                {/* --- START: แก้ไขส่วนหัวตาราง --- */}
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2 w-12 text-center">Return</th>
                                        <th className="p-2 text-left">Category</th>
                                        <th className="p-2 text-left">Brand</th>
                                        <th className="p-2 text-left">Product</th>
                                        <th className="p-2 text-left">Serial Number</th>
                                    </tr>
                                </thead>
                                {/* --- END: แก้ไขส่วนหัวตาราง --- */}
                                <tbody>
                                    {itemsToReturn.map(item => (
                                        <tr
                                            key={item.inventoryItemId}
                                            className="border-b cursor-pointer hover:bg-slate-50"
                                            onClick={() => handleToggleReturnItem(item.inventoryItemId)}
                                        >
                                            <td className="p-2 text-center">
                                                {selectedToReturn.includes(item.inventoryItemId)
                                                    ? <CheckSquare className="h-5 w-5 text-primary mx-auto" />
                                                    : <Square className="h-5 w-5 text-muted-foreground mx-auto" />
                                                }
                                            </td>
                                            {/* --- START: เพิ่ม Cell ของตาราง --- */}
                                            <td className="p-2">{item.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
                                            {/* --- END: เพิ่ม Cell ของตาราง --- */}
                                            <td className="p-2">{item.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.serialNumber || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={selectedToReturn.length === 0}>
                                    Confirm Return ({selectedToReturn.length} items)
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Return</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to return {selectedToReturn.length} item(s). This will change their status back to "IN_STOCK". Are you sure?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleReturnItems}>
                                        Continue
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}