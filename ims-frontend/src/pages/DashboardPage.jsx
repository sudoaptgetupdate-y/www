// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from 'recharts';

const calculateSaleTotal = (items) => items.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
const COLORS = ['#16A34A', '#64748B', '#F97316', '#DC2626', '#3B82F6'];

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axiosInstance.get('/dashboard/stats', {
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

    const pieChartData = stats.stockStatus.map(s => ({ name: s.status, value: s._count.id }));

    return (
        <div className="space-y-6">
            {/* --- START: ส่วนที่แก้ไข: เพิ่ม Stat Cards ของ Asset --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} THB</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Items In Stock (For Sale)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.itemsInStock.toLocaleString()}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Total Company Assets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAssets.toLocaleString()}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Assigned Assets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.assignedAssets.toLocaleString()}</p></CardContent></Card>
            </div>
             {/* --- END --- */}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader><CardTitle>Sales Last 7 Days</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.salesChartData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                                <YAxis stroke="#888888" fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Inventory Stock Overview</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-left text-sm">
                        <thead><tr className="border-b"><th className="p-2">Customer</th><th className="p-2">Date</th><th className="p-2 text-center">Items</th><th className="p-2 text-right">Total</th></tr></thead>
                        <tbody>{stats.recentSales.map(sale => (
                            <tr key={sale.id} className="border-b">
                                <td className="p-2">{sale.customer.name}</td>
                                <td className="p-2">{new Date(sale.saleDate).toLocaleString()}</td>
                                <td className="p-2 text-center">{sale.itemsSold.length}</td>
                                <td className="p-2 text-right">{sale.total.toLocaleString()} THB</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}