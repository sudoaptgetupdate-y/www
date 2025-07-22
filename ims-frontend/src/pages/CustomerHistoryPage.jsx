// src/pages/CustomerHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart, PackageOpen, Package, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge"; // <-- Import

const StatCard = ({ title, value, icon, description, onClick }) => (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:border-primary transition-colors" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function CustomerHistoryPage() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!customerId || !token) return;
            try {
                setLoading(true);
                const [historyRes, summaryRes, customerRes] = await Promise.all([
                    axiosInstance.get(`/customers/${customerId}/history`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${customerId}/summary`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setHistory(historyRes.data);
                setSummary(summaryRes.data);
                setCustomer(customerRes.data);
            } catch (error) {
                toast.error("Failed to fetch customer data.");
                navigate("/customers");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [customerId, token, navigate]);

    if (loading || !summary) return <p>Loading customer data...</p>;

    // --- ลบ getTransactionTypeStyle และ getBorrowStatusVariant ---

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6" /> Customer Details
                    </h1>
                    <p className="text-muted-foreground">For Customer: {customer?.name || '...'}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/customers')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Customers
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title="Items Purchased"
                    value={summary.purchaseHistory.length}
                    icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                    description="Total items bought by this customer."
                    onClick={() => navigate(`/customers/${customerId}/purchase-history`)}
                />
                <StatCard 
                    title="Currently Borrowed"
                    value={summary.currentlyBorrowedItems.length}
                    icon={<PackageOpen className="h-4 w-4 text-muted-foreground" />}
                    description="Items that have not been returned yet."
                     onClick={() => navigate(`/customers/${customerId}/active-borrowings`)}
                />
                <StatCard 
                    title="Total Items Returned"
                    value={summary.returnedItemsHistory.length}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    description="History of all returned items."
                    onClick={() => navigate(`/customers/${customerId}/returned-history`)}
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Log</CardTitle>
                    <CardDescription>A complete history of all sales and borrowings for this customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm whitespace-nowrap">
                            <colgroup>
                                <col className="w-[120px]" />
                                <col className="w-[30%]" />
                                <col className="w-[10%]" />
                                <col className="w-[30%]" />
                                <col className="w-[120px]" />
                            </colgroup>
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-center">Type</th>
                                    <th className="p-2 text-left">Date</th>
                                    <th className="p-2 text-center">Items</th>
                                    <th className="p-2 text-right">Total / Status</th>
                                    <th className="p-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                     <tr><td colSpan="5" className="text-center p-4 text-muted-foreground">No transaction history found.</td></tr>
                                ) : history.map((item) => {
                                    return (
                                        <tr key={item.id} className="border-b">
                                            <td className="p-2 text-center">
                                                <StatusBadge status={item.type} className="w-20" />
                                            </td>
                                            <td className="p-2 text-left">{new Date(item.date).toLocaleString()}</td>
                                            <td className="p-2 text-center">{item.itemCount}</td>
                                            <td className="p-2 text-right">
                                                {item.type === 'SALE' 
                                                    ? `${item.details.total.toLocaleString('en-US')} THB`
                                                    : <StatusBadge status={item.details.status} className="w-24" />
                                                }
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => navigate(item.type === 'SALE' ? `/sales/${item.details.id}` : `/borrowings/${item.details.id}`)}
                                                >
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}