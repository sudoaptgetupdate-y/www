// src/pages/AssetAssignmentDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Square, Printer, CornerDownLeft, HardDrive } from "lucide-react";
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

export default function AssetAssignmentDetailPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedToReturn, setSelectedToReturn] = useState([]);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);


    const fetchDetails = async () => {
        if (!assignmentId || !token) return;
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/asset-assignments/${assignmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignment(response.data);
        } catch (error) {
            toast.error("Failed to fetch assignment details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [assignmentId, token]);

    const handleToggleReturnItem = (itemId) => {
        setSelectedToReturn(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const handleReturnItems = async () => {
        if (selectedToReturn.length === 0) {
            toast.error("Please select at least one asset to return.");
            return;
        }
        try {
            await axiosInstance.patch(`/asset-assignments/${assignmentId}/return`,
                { itemIdsToReturn: selectedToReturn },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Assets have been returned successfully.");
            setIsReturnDialogOpen(false);
            fetchDetails();
            setSelectedToReturn([]);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading) return <p>Loading assignment details...</p>;
    if (!assignment) return <p>Record not found.</p>;

    const itemsToReturn = assignment.items.filter(item => !item.returnedAt);
    const formattedAssignmentId = assignment.id.toString().padStart(6, '0');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <HardDrive className="h-6 w-6" />
                        Assignment Details
                    </h1>
                    <p className="text-muted-foreground mt-1">Viewing details for Assignment ID #{formattedAssignmentId}</p>
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
                            <CornerDownLeft className="mr-2"/> Receive Returned Assets
                        </Button>
                    )}
                </div>
            </div>

            <div className="printable-area font-sarabun">
                 <div className="print-header hidden">
                    <h1 className="text-xl font-bold">ใบเบิกจ่ายทรัพย์สิน / Asset Assignment Note</h1>
                </div>

                <Card className="p-4 sm:p-6 md:p-8">
                    <CardHeader className="p-0 mb-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">ผู้เบิก (Assignee)</p>
                                <p className="font-semibold">{assignment.assignee?.name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{assignment.assignee?.username || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">อีเมล: {assignment.assignee?.email || 'N/A'}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                 <p className="text-sm text-muted-foreground">เลขที่ (Assignment ID)</p>
                                 <p className="font-semibold">#{formattedAssignmentId}</p>
                                 <p className="text-sm text-muted-foreground">วันที่เบิก (Assigned Date)</p>
                                 <p className="font-semibold">{new Date(assignment.assignedDate).toLocaleString('th-TH')}</p>
                                 <p className="text-sm text-muted-foreground">ผู้อนุมัติ (Approved By)</p>
                                 <p className="font-semibold">{assignment.approvedBy?.name || 'N/A'}</p>
                                 {assignment.returnDate && (
                                    <>
                                    <p className="text-sm text-muted-foreground">วันที่คืนครบ (Completion Date)</p>
                                    <p className="font-semibold">{new Date(assignment.returnDate).toLocaleString('th-TH')}</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end no-print">
                            <StatusBadge status={assignment.status} className="w-32 text-base" />
                        </div>
                        {assignment.notes && (
                            <div className="mt-6">
                                <p className="font-semibold">หมายเหตุ (Notes):</p>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground border p-3 rounded-md bg-muted/30 no-print">{assignment.notes}</p>
                                <p className="whitespace-pre-wrap text-sm print-block hidden">{assignment.notes}</p>
                            </div>
                        )}
                    </CardHeader>
                </Card>
                
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>รายการทรัพย์สินที่เบิก ({assignment.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40">
                                        <th className="p-2 text-left">Category</th>
                                        <th className="p-2 text-left">Brand</th>
                                        <th className="p-2 text-left">Product Model</th>
                                        <th className="p-2 text-left">Asset Code</th>
                                        <th className="p-2 text-left">Serial Number</th>
                                        <th className="p-2 text-left">สถานะ (Status)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignment.items.map(item => (
                                        <tr key={item.inventoryItem.id} className="border-b">
                                            <td className="p-2">{item.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.assetCode || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.serialNumber || 'N/A'}</td>
                                            <td className="p-2">
                                                <StatusBadge status={item.returnedAt ? 'RETURNED' : 'ASSIGNED'} />
                                                {item.returnedAt && (
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        (เมื่อ {new Date(item.returnedAt).toLocaleDateString('th-TH')})
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="signature-section hidden">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {assignment.approvedBy?.name || '.....................................................'} )</p>
                        <p>เจ้าหน้าที่ผู้จ่ายทรัพย์สิน</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {assignment.assignee?.name || '.....................................................'} )</p>
                        <p>พนักงานผู้รับทรัพย์สิน</p>
                    </div>
                </div>
            </div>

            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                 <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Receive Returned Assets</DialogTitle>
                        <DialogDescription>Select assets that the employee is returning.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                        <div className="border rounded-md">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2 w-12 text-center">Return</th>
                                        <th className="p-2 text-left">Asset Code</th>
                                        <th className="p-2 text-left">Category</th>
                                        <th className="p-2 text-left">Brand</th>
                                        <th className="p-2 text-left">Product</th>
                                        <th className="p-2 text-left">Serial Number</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsToReturn.map(item => (
                                        <tr
                                            key={item.inventoryItem.id}
                                            className="border-b cursor-pointer hover:bg-slate-50"
                                            onClick={() => handleToggleReturnItem(item.inventoryItem.id)}
                                        >
                                            <td className="p-2 text-center">
                                                {selectedToReturn.includes(item.inventoryItem.id)
                                                    ? <CheckSquare className="h-5 w-5 text-primary mx-auto" />
                                                    : <Square className="h-5 w-5 text-muted-foreground mx-auto" />
                                                }
                                            </td>
                                            <td className="p-2">{item.inventoryItem?.assetCode || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                            <td className="p-2">{item.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
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
                                        You are about to return {selectedToReturn.length} asset(s). This will change their status back to "IN_WAREHOUSE". Are you sure?
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