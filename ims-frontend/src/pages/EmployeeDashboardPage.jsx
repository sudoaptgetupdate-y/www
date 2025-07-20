// src/pages/EmployeeDashboardPage.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmployeeDashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // เรียกใช้ API ใหม่สำหรับ Employee
                const response = await axiosInstance.get('/dashboard/employee-stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                toast.error("Could not load dashboard data.");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchStats();
    }, [token]);

    if (loading) return <div>Loading Dashboard...</div>;
    if (!stats) return <div>Could not load data.</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Welcome, {currentUser?.name || 'Employee'}!</h1>
            
            {/* Stat Cards สำหรับ Employee */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle>Items In Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.itemsInStock.toLocaleString()}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Defective Items</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{stats.defectiveItems.toLocaleString()}</p></CardContent></Card>
            </div>

             {/* Recent Sales Table */}
            <Card>
                <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-left text-sm">
                        <thead><tr className="border-b"><th className="p-2">Customer</th><th className="p-2">Date</th><th className="p-2 text-center">Items Sold</th></tr></thead>
                        <tbody>{stats.recentSales.map(sale => (
                            <tr key={sale.id} className="border-b">
                                <td className="p-2">{sale.customer.name}</td>
                                <td className="p-2">{new Date(sale.saleDate).toLocaleString()}</td>
                                <td className="p-2 text-center">{sale.itemsSold.length}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}