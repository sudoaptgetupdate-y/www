// src/pages/BorrowingDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Square, Printer } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/StatusBadge"; 

export default function BorrowingDetailPage() {
    const { borrowingId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [borrowing, setBorrowing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedToReturn, setSelectedToReturn] = useState([]);

    const fetchDetails = async () => {
        if (!borrowingId || !token) return;
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/borrowings/${borrowingId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBorrowing(response.data);
            setSelectedToReturn(response.data.items.filter(item => !item.returnedAt).map(item => item.id));
        } catch (error)
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
    
    const handlePrint = () => {
        window.print();
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
            fetchDetails(); 
            setSelectedToReturn([]);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading) return <p>Loading details...</p>;
    if (!borrowing) return <p>Record not found.</p>;

    const itemsToReturn = borrowing.items.filter(item => !item.returnedAt);

    return (
        <div className="space-y-6 printable-area">
            <div className="flex justify-between items-center no-print">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            </div>

            <div className="print-header hidden">
                <h1>ใบยืม-คืนสินค้า / Borrowing Note</h1>
                <p>เอกสารฉบับนี้เป็นการยืนยันการยืมสินค้า</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Borrowing Details</CardTitle>
                    <CardDescription>Record ID: {borrowing.id}</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4 text-sm print:flex print:justify-between">
                    <div>
                        <p className="font-semibold">Customer</p>
                        {/* --- START: ส่วนที่แก้ไข --- */}
                        <p>{borrowing.borrower?.name || 'N/A'}</p>
                        {/* --- END --- */}
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 print:text-right">
                        <div>
                            <p className="font-semibold">Borrow Date</p>
                            <p>{new Date(borrowing.borrowDate).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Due Date</p>
                            <p>{borrowing.dueDate ? new Date(borrowing.dueDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Approved By</p>
                            {/* --- START: ส่วนที่แก้ไข --- */}
                            <p>{borrowing.approvedBy?.name || 'N/A'}</p>
                            {/* --- END --- */}
                        </div>
                        <div>
                            <p className="font-semibold">Status</p>
                            <div><StatusBadge status={borrowing.status} /></div>
                        </div>
                        {borrowing.returnDate && (
                            <div>
                                <p className="font-semibold">Final Return Date</p>
                                <p>{new Date(borrowing.returnDate).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                    {borrowing.notes && (
                        <div className="md:col-span-3 pt-4">
                            <p className="font-semibold">Notes</p>
                            <p className="whitespace-pre-wrap text-muted-foreground">{borrowing.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {itemsToReturn.length > 0 && (
                <Card className="no-print">
                    <CardHeader>
                        <CardTitle>Items to Return</CardTitle>
                        <CardDescription>Select items that the customer is returning now.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2 w-12 text-center">Return</th>
                                        <th className="p-2 text-left">Product</th>
                                        <th className="p-2 text-left">Serial Number</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsToReturn.map(item => (
                                        <tr 
                                            key={item.id} 
                                            className="border-b cursor-pointer hover:bg-slate-50"
                                            onClick={() => handleToggleReturnItem(item.id)}
                                        >
                                            <td className="p-2 text-center">
                                                {selectedToReturn.includes(item.id) 
                                                    ? <CheckSquare className="h-5 w-5 text-primary mx-auto" /> 
                                                    : <Square className="h-5 w-5 text-muted-foreground mx-auto" />
                                                }
                                            </td>
                                            <td className="p-2">{item.productModel?.modelNumber || 'N/A'}</td>
                                            <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    <CardFooter>
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
                    </CardFooter>
                </Card>
            )}

            <Card>
                 <CardHeader><CardTitle>Borrowed Items List ({borrowing.items.length})</CardTitle></CardHeader>
                 <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Product Model</th>
                                <th className="p-2 text-left">Serial Number</th>
                                <th className="p-2 text-left">MAC Address</th>
                                <th className="p-2 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {borrowing.items.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2">{item.productModel?.modelNumber || 'N/A'}</td>
                                    <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                    <td className="p-2">{item.macAddress || 'N/A'}</td>
                                    <td className="p-2">
                                        <StatusBadge status={item.returnedAt ? 'RETURNED' : 'BORROWED'} />
                                        {item.returnedAt && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                                on {new Date(item.returnedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </CardContent>
            </Card>

            <div className="signature-section hidden">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <p>( ..................................................... )</p>
                    <p>เจ้าหน้าที่</p>
                </div>
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <p>( ..................................................... )</p>
                    <p>ผู้ยืมสินค้า</p>
                </div>
            </div>
        </div>
    );
}