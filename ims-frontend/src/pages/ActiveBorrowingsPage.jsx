// src/pages/ActiveBorrowingsPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Square } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ActiveBorrowingsPage() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    
    const [allItems, setAllItems] = useState([]); 
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- START: ส่วนที่แก้ไข 1: เพิ่ม State สำหรับเก็บรายการที่เลือก ---
    const [selectedToReturn, setSelectedToReturn] = useState([]);
    // --- END ---

    const fetchData = async () => {
        if (!customerId || !token) return;
        try {
            setLoading(true);
            const [borrowingsRes, customerRes] = await Promise.all([
                axiosInstance.get(`/customers/${customerId}/active-borrowings`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axiosInstance.get(`/customers/${customerId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            
            const flattenedItems = borrowingsRes.data.flatMap(transaction => 
                transaction.items.map(item => ({
                    ...item,
                    borrowingId: transaction.id
                }))
            );
            setAllItems(flattenedItems);
            setCustomer(customerRes.data);
        } catch (error) {
            toast.error("Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [customerId, token]);

    // --- START: ส่วนที่แก้ไข 2: เพิ่มฟังก์ชันสำหรับจัดการ Check List และการคืนของทีละหลายชิ้น ---
    const handleToggleReturnItem = (itemId) => {
        setSelectedToReturn(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };
    
    const handleReturnSelectedItems = async () => {
        if (selectedToReturn.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }

        // จัดกลุ่ม item ที่เลือกตาม borrowingId
        const itemsByBorrowing = selectedToReturn.reduce((acc, itemId) => {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
                const { borrowingId } = item;
                if (!acc[borrowingId]) {
                    acc[borrowingId] = [];
                }
                acc[borrowingId].push(itemId);
            }
            return acc;
        }, {});

        // สร้าง Promise สำหรับยิง API ไปยังแต่ละ borrowingId
        const returnPromises = Object.entries(itemsByBorrowing).map(([borrowingId, itemIds]) =>
            axiosInstance.patch(`/borrowings/${borrowingId}/return`,
                { itemIdsToReturn: itemIds },
                { headers: { Authorization: `Bearer ${token}` } }
            )
        );

        try {
            await Promise.all(returnPromises);
            toast.success(`${selectedToReturn.length} item(s) have been returned successfully.`);
            fetchData();
            setSelectedToReturn([]);
        } catch (error) {
            toast.error("An error occurred while returning items.");
        }
    };
    // --- END ---

    if (loading) return <p>Loading active borrowings...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Active Borrowed Items</h1>
                    <p className="text-muted-foreground">For Customer: {customer?.name || '...'}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/customers/${customerId}/history`, { state: { defaultTab: 'summary' } })}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Summary
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Borrowed Items ({allItems.length})</CardTitle>
                    <CardDescription>
                        Select items to return. You can return items from different borrowing records at the same time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* --- START: ส่วนที่แก้ไข 3: ปรับตารางเป็น Check list --- */}
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 w-12 text-center">Return</th>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Serial Number</th>
                                    <th className="p-2 text-left">From Borrowing ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allItems.length > 0 ? (
                                    allItems.map(item => (
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
                                            <td className="p-2">{item.productModel.modelNumber}</td>
                                            <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                            <td className="p-2">{item.borrowingId}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="p-4 text-center text-muted-foreground">
                                            This customer has no active borrowings.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     {/* --- END --- */}
                </CardContent>
                {/* --- START: ส่วนที่แก้ไข 4: เพิ่มปุ่ม Confirm Return --- */}
                {allItems.length > 0 && (
                    <CardFooter className="pt-6">
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
                                    <AlertDialogAction onClick={handleReturnSelectedItems}>
                                        Continue
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                )}
                 {/* --- END --- */}
            </Card>
        </div>
    );
}