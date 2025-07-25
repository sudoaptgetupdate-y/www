// src/pages/EmployeeDashboardPage.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// --- START: 1. Import ไอคอน ---
import { Package, XCircle, ShoppingCart } from 'lucide-react';
// --- END ---

export default function EmployeeDashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        const fetchStats = async () => {
            try {
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
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* --- START: 2. ปรับปรุง Stat Cards --- */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items In Stock</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.itemsInStock.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Defective Items</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-red-600">{stats.defectiveItems.toLocaleString()}</p>
                    </CardContent>
                </Card>
                {/* --- END --- */}
            </div>

            <Card>
                {/* --- START: 3. ปรับปรุง Header ของตาราง --- */}
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Recent Sales
                    </CardTitle>
                </CardHeader>
                {/* --- END --- */}
                <CardContent>
                    {/* --- START: 4. เพิ่ม Div ครอบ Table และปรับปรุง Header --- */}
                    <div className="border rounded-md">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2">Customer</th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2 text-center">Items Sold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentSales.map(sale => (
                                <tr key={sale.id} className="border-b">
                                    <td className="p-2">{sale.customer.name}</td>
                                    <td className="p-2">{new Date(sale.saleDate).toLocaleString()}</td>
                                    <td className="p-2 text-center">{sale.itemsSold.length}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    {/* --- END --- */}
                </CardContent>
            </Card>
        </div>
    );
}
