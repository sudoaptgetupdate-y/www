// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell, Legend } from 'recharts';
import { DollarSign, Package, Layers, ArrowRightLeft } from 'lucide-react';

const StatCard = ({ title, value, icon, description }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const COLORS = ['#22c55e', '#64748b', '#f97316', '#ef4444', '#3b82f6']; // Green, Slate, Orange, Red, Blue

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);

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

    if (loading) return <div className="text-center p-10">Loading Dashboard...</div>;
    if (!stats) return <div className="text-center p-10">Could not load data.</div>;

    const pieChartData = stats.stockStatus.map(s => ({ 
        name: s.status.replace(/_/g, ' '), 
        value: s._count.id 
    }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Welcome back, {currentUser?.name}!</h1>
                <p className="text-sm text-slate-500">Here's a summary of your operations.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Revenue" value={`${stats.totalRevenue.toLocaleString()} THB`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} description="All time revenue" />
                <StatCard title="Items In Stock" value={stats.itemsInStock.toLocaleString()} icon={<Package className="h-4 w-4 text-muted-foreground" />} description="Items available for sale" />
                <StatCard title="Total Company Assets" value={stats.totalAssets.toLocaleString()} icon={<Layers className="h-4 w-4 text-muted-foreground" />} description="All company-owned assets" />
                <StatCard title="Assigned Assets" value={stats.assignedAssets.toLocaleString()} icon={<ArrowRightLeft className="h-4 w-4 text-muted-foreground" />} description="Assets currently with employees" />
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Last 7 Days</CardTitle>
                        <CardDescription>Total number of sales transactions per day.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stats.salesChartData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Inventory Overview</CardTitle>
                         <CardDescription>Current status of all items for sale.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                             <PieChart>
                                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} labelLine={false}>
                                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-3 font-medium text-muted-foreground">Customer</th>
                                    <th className="p-3 font-medium text-muted-foreground">Date</th>
                                    <th className="p-3 font-medium text-muted-foreground text-center">Items</th>
                                    <th className="p-3 font-medium text-muted-foreground text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>{stats.recentSales.map(sale => (
                                <tr key={sale.id} className="border-b">
                                    <td className="p-3 font-medium text-slate-800">{sale.customer.name}</td>
                                    <td className="p-3 text-muted-foreground">{new Date(sale.saleDate).toLocaleString()}</td>
                                    <td className="p-3 text-center">{sale.itemsSold.length}</td>
                                    <td className="p-3 text-right font-semibold">{sale.total.toLocaleString()} THB</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}