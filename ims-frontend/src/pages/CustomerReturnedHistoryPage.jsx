// src/pages/CustomerReturnedHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function CustomerReturnedHistoryPage() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [items, setItems] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!customerId || !token) return;
            try {
                setLoading(true);
                const [itemsRes, customerRes] = await Promise.all([
                    axiosInstance.get(`/customers/${customerId}/returned-history`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setItems(itemsRes.data);
                setCustomerName(customerRes.data.name);
            } catch (error) {
                toast.error("Failed to fetch returned history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [customerId, token]);

    if (loading) return <p>Loading returned items history...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Returned Items History</h1>
                    <p className="text-muted-foreground">For Customer: {customerName}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/customers/${customerId}/history`, { state: { defaultTab: 'summary' } })}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Summary
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Returned Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* --- START: ส่วนที่แก้ไข --- */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2 text-left">Serial Number</th>
                                <th className="p-2 text-left">Borrowed On</th>
                                <th className="p-2 text-left">Returned On</th>
                                <th className="p-2 text-left">From Borrowing ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={`${item.id}-${item.transactionId}`} className="border-b">
                                    <td className="p-2">{item.productModel.modelNumber}</td>
                                    <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                    <td className="p-2">{item.borrowDate ? new Date(item.borrowDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-2">{item.returnDate ? new Date(item.returnDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-2">{item.transactionId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {/* --- END --- */}
                </CardContent>
            </Card>
        </div>
    );
}