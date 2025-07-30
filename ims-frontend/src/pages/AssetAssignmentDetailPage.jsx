// src/pages/AssetAssignmentDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, User, Printer, CornerDownLeft } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ReturnItemsDialog = ({ isOpen, onOpenChange, itemsToReturn, onConfirm }) => {
    const [selectedToReturn, setSelectedToReturn] = useState([]);

    const handleToggleReturnItem = (itemId) => {
        setSelectedToReturn(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const allItemIdsToReturn = itemsToReturn.map(item => item.inventoryItemId);
    const isAllSelected = allItemIdsToReturn.length > 0 && selectedToReturn.length === allItemIdsToReturn.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedToReturn([]);
        } else {
            setSelectedToReturn(allItemIdsToReturn);
        }
    };
    
    const handleConfirm = () => {
        onConfirm(selectedToReturn);
        setSelectedToReturn([]);
    };

    // Reset state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedToReturn([]);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Receive Returned Assets</DialogTitle>
                    <DialogDescription>Select assets that the employee is returning.</DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center px-2">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead>Asset Code</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Serial Number</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {itemsToReturn.map(item => (
                                    <TableRow
                                        key={item.inventoryItemId}
                                        className="cursor-pointer"
                                        onClick={() => handleToggleReturnItem(item.inventoryItemId)}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={selectedToReturn.includes(item.inventoryItemId)}
                                                onCheckedChange={() => handleToggleReturnItem(item.inventoryItemId)}
                                                aria-label={`Select item ${item.inventoryItem.serialNumber}`}
                                            />
                                        </TableCell>
                                        <TableCell>{item.inventoryItem.assetCode}</TableCell>
                                        <TableCell>{item.inventoryItem.productModel.category.name}</TableCell>
                                        <TableCell>{item.inventoryItem.productModel.modelNumber}</TableCell>
                                        <TableCell>{item.inventoryItem.serialNumber || 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
                                    <AlertDialogAction onClick={handleConfirm}>
                                        Continue
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function AssetAssignmentDetailPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
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

    const handleReturnItems = async (itemIdsToReturn) => {
        if (itemIdsToReturn.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }
        try {
            await axiosInstance.patch(`/asset-assignments/${assignmentId}/return`,
                { itemIdsToReturn },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Assets have been returned successfully.");
            setIsReturnDialogOpen(false);
            fetchDetails();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading) return <p>Loading details...</p>;
    if (!assignment) return <p>Record not found.</p>;

    const itemsToReturn = assignment.items.filter(item => !item.returnedAt && item.inventoryItem);
    const formattedAssignmentId = assignment.id.toString().padStart(6, '0');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Asset Assignment Details
                    </h1>
                    <p className="text-muted-foreground">Viewing details for Assignment ID #{formattedAssignmentId}</p>
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
                            <CornerDownLeft className="mr-2" /> Receive Returned Assets
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="lg:col-span-3">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <div>
                                <CardTitle>Assignment Details</CardTitle>
                                <CardDescription>Record ID #{formattedAssignmentId}</CardDescription>
                            </div>
                             <StatusBadge status={assignment.status} className="w-28 text-base"/>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-semibold">Assignee</h4>
                                <p>{assignment.assignee.name}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold">Assignment Date</h4>
                                <p>{new Date(assignment.assignmentDate).toLocaleString()}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold">Assigned By</h4>
                                {/* --- START: แก้ไขโดยใช้ Optional Chaining --- */}
                                <p>{assignment.assignedBy?.name || 'N/A'}</p>
                                {/* --- END --- */}
                            </div>
                        </div>
                         {assignment.notes && (
                            <div>
                                <h4 className="font-semibold">Notes</h4>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground border p-3 rounded-md bg-muted/30">{assignment.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Assigned Assets ({assignment.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40">
                                        <th className="p-2 text-left">Asset Code</th>
                                        <th className="p-2 text-left">Category</th>
                                        <th className="p-2 text-left">Brand</th>
                                        <th className="p-2 text-left">Product Model</th>
                                        <th className="p-2 text-left">Serial Number</th>
                                        <th className="p-2 text-left">Status</th>
                                        <th className="p-2 text-left">Returned Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignment.items.map(record => (
                                        <tr key={record.inventoryItemId} className="border-b">
                                            <td className="p-2">{record.inventoryItem?.assetCode || 'N/A'}</td>
                                            <td className="p-2">{record.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                            <td className="p-2">{record.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
                                            <td className="p-2">{record.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                            <td className="p-2">{record.inventoryItem?.serialNumber || 'N/A'}</td>
                                            <td className="p-2"><StatusBadge status={record.returnedAt ? 'RETURNED' : 'ASSIGNED'} /></td>
                                            <td className="p-2">{record.returnedAt ? new Date(record.returnedAt).toLocaleString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ReturnItemsDialog
                isOpen={isReturnDialogOpen}
                onOpenChange={setIsReturnDialogOpen}
                itemsToReturn={itemsToReturn}
                onConfirm={handleReturnItems}
            />

            {/* Printable Section */}
            <div className="hidden print:block font-sarabun">
                <h1 className="text-2xl font-bold text-center mb-4">ใบเบิก-จ่ายทรัพย์สิน</h1>
                <div className="border border-black p-4 text-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p><strong>ผู้เบิก:</strong> {assignment.assignee.name}</p>
                            <p><strong>แผนก:</strong> {assignment.assignee.department || 'N/A'}</p>
                        </div>
                         <div className="text-right">
                             <p><strong>เลขที่เอกสาร:</strong> ASSIGN-{formattedAssignmentId}</p>
                            <p><strong>วันที่เบิก:</strong> {new Date(assignment.assignmentDate).toLocaleDateString('th-TH')}</p>
                        </div>
                    </div>
                     <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1">ลำดับ</th>
                                <th className="border border-black p-1">รหัสทรัพย์สิน</th>
                                <th className="border border-black p-1">รายการ</th>
                                <th className="border border-black p-1">Serial Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignment.items.map((record, index) => (
                                <tr key={record.inventoryItemId}>
                                    <td className="border border-black p-1 text-center">{index + 1}</td>
                                    <td className="border border-black p-1">{record.inventoryItem?.assetCode}</td>
                                    <td className="border border-black p-1">{record.inventoryItem?.productModel?.modelNumber}</td>
                                    <td className="border border-black p-1">{record.inventoryItem?.serialNumber}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <div className="mt-4">
                         <strong>หมายเหตุ:</strong>
                        <p className="whitespace-pre-wrap">{assignment.notes || 'ไม่มี'}</p>
                    </div>
                     <div className="grid grid-cols-2 gap-4 mt-16 text-center">
                        <div>
                            <p>....................................................</p>
                            <p>({assignment.assignee.name})</p>
                            <p>ผู้เบิก</p>
                        </div>
                        <div>
                            <p>....................................................</p>
                            {/* --- START: แก้ไขโดยใช้ Optional Chaining --- */}
                            <p>({assignment.assignedBy?.name || '...................................'})</p>
                            {/* --- END --- */}
                            <p>ผู้อนุมัติ</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}