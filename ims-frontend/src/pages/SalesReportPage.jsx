// src/pages/SalesReportPage.jsx

import { useState, useEffect } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Star, UserCheck, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';


const StatCard = ({ title, value, icon: Icon }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold truncate">{value}</div>
        </CardContent>
    </Card>
);

const TopProductsCard = ({ products = [] }) => ( // <-- เพิ่มค่าเริ่มต้นให้ products
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 10 Best Selling Products
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {products.length > 0 ? products.map((product, index) => (
                    <div key={product.productModelId} className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {index + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-medium truncate">{product.modelNumber}</p>
                            <p className="text-sm text-muted-foreground">{product.unitsSold} units sold</p>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                            ฿{product.totalRevenue.toLocaleString('en-US')}
                        </Badge>
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No product sales data for this period.</p>
                )}
            </div>
        </CardContent>
    </Card>
);


export default function SalesReportPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
    
    const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));
    const months = [
        { value: 'all', label: 'All Year' },
        ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }))
    ];

    useEffect(() => {
        const fetchReport = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const params = { year: selectedYear };
                if (selectedMonth !== 'all') {
                    params.month = selectedMonth;
                }
                const response = await axiosInstance.get('/reports/sales', {
                    headers: { Authorization: `Bearer ${token}` },
                    params,
                });
                setReportData(response.data);
            } catch (error) {
                toast.error("Failed to load sales report.");
                setReportData(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [token, selectedYear, selectedMonth]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Sales Report</h1>
                    <p className="text-muted-foreground">An overview of your sales performance.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading && <p>Loading report...</p>}
            
            {!isLoading && !reportData && <p>No data available for the selected period.</p>}

            {!isLoading && reportData && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Total Revenue" value={reportData.summary.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'THB' })} icon={DollarSign} />
                        <StatCard title="Total Sales" value={reportData.summary.totalSales} icon={ShoppingCart} />
                        <StatCard title="Best Selling Product" value={reportData.summary.bestSellingProduct || 'N/A'} icon={Star} />
                        <StatCard title="Top Customer" value={reportData.summary.topCustomer || 'N/A'} icon={UserCheck} />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Revenue Over Time</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px] w-full pl-0">
                                <ResponsiveContainer>
                                    <BarChart data={reportData.salesOverTime}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={(value) => `฿${value > 1000 ? `${value/1000}k` : value}`} />
                                        <Tooltip formatter={(value) => [`฿${value.toLocaleString()}`, 'Revenue']} cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <TopProductsCard products={reportData.top10Products} />
                    </div>


                    <Card>
                        <CardHeader>
                            <CardTitle>Transactions</CardTitle>
                            <CardDescription>All sales transactions in the selected period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sale ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(reportData.transactions || []).map(sale => (
                                            <TableRow key={sale.id}>
                                                <TableCell>#{sale.id.toString().padStart(6, '0')}</TableCell>
                                                <TableCell>{sale.customer.name}</TableCell>
                                                <TableCell>{new Date(sale.saleDate).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
                                                        Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}