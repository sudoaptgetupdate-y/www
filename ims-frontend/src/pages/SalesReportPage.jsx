// src/pages/SalesReportPage.jsx

import { useState, useEffect } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Users, TrendingUp, Package, ArrowUp, ArrowDown, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// --- 1. Import Table Components ---
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
};

const StatCard = ({ title, value, icon: Icon, details, percentageChange, periodText, className }) => (
    <Card className={cn("shadow-sm transition-all hover:shadow-md hover:-translate-y-1", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold truncate">{value}</div>
            {percentageChange !== undefined ? (
                <div className="flex items-center text-xs text-muted-foreground">
                    {percentageChange > 0 && <ArrowUp className="h-3 w-3 mr-1 text-emerald-500" />}
                    {percentageChange < 0 && <ArrowDown className="h-3 w-3 mr-1 text-red-500" />}
                    <span className={cn(
                        percentageChange > 0 && 'text-emerald-500',
                        percentageChange < 0 && 'text-red-500'
                    )}>
                        {percentageChange.toFixed(1)}%
                    </span>
                    <span className="ml-1">from last {periodText}</span>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">{details}</p>
            )}
        </CardContent>
    </Card>
);

// --- 2. Refactor TopListCard to use a proper Table ---
const TopListCard = ({ title, data, icon: Icon, columns }) => (
     <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data && data.length > 0 ? data.map((row, index) => (
                            <TableRow key={index}>
                                {columns.map((col) => (
                                    <TableCell key={`${index}-${col.key}`} className={col.className}>
                                        {col.render(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No data for this period.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
);


export default function SalesReportPage() {
    const token = useAuthStore((state) => state.token);
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [filterMode, setFilterMode] = useState('recent');
    const [period, setPeriod] = useState('this_month');
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));
    
    useEffect(() => {
        const fetchReport = async () => {
            if (!token) return;
            setIsLoading(true);
            
            let params = {};
            if (filterMode === 'recent') {
                params = { period };
            } else {
                params = { period: 'this_year', year: selectedYear };
            }

            try {
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
    }, [token, period, selectedYear, filterMode]);
    
    const recentFilterOptions = [
        { label: "This Month", value: "this_month", periodText: "month" },
        { label: "Last 3 Months", value: "last_3_months", periodText: "3 months" },
        { label: "Last 6 Months", value: "last_6_months", periodText: "6 months" },
    ];

    const revenueChange = reportData ? calculatePercentageChange(reportData.summary.totalRevenue, reportData.comparison.prevTotalRevenue) : 0;
    const itemsSoldCount = reportData ? calculatePercentageChange(reportData.summary.totalItemsSoldCount, reportData.comparison.prevTotalItemsSoldCount) : 0;
    const periodText = recentFilterOptions.find(o => o.value === period)?.periodText || 'year';

    // --- 3. Define columns for each table, similar to DashboardPage ---
    const topProductsColumns = [
        { key: 'product', header: 'Product', render: (row) => (
            <div>
                <p className="font-medium">{row.modelNumber}</p>
                <p className="text-xs text-muted-foreground">{row.count} units sold</p>
            </div>
        ), className: ""},
        { key: 'revenue', header: 'Revenue', render: (row) => `฿${row.revenue.toLocaleString()}`, className: "text-right font-medium" },
    ];

    const topCustomersColumns = [
        { key: 'customer', header: 'Customer', render: (row) => row.name, className: "font-medium" },
        { key: 'revenue', header: 'Total Spent', render: (row) => `฿${row.totalRevenue.toLocaleString()}`, className: "text-right font-medium" },
    ];


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Sales Overview</h1>
                    <p className="text-muted-foreground">Track and analyze your sales performance.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
                        <Button variant={filterMode === 'recent' ? 'secondary' : 'ghost'} size="sm" className="rounded-full" onClick={() => setFilterMode('recent')}>Recent</Button>
                        <Button variant={filterMode === 'by_year' ? 'secondary' : 'ghost'} size="sm" className="rounded-full" onClick={() => setFilterMode('by_year')}>By Year</Button>
                    </div>
                    {filterMode === 'recent' ? (
                        <div className="flex items-center gap-2">
                             {recentFilterOptions.map(option => (
                                <Button
                                    key={option.value}
                                    variant={period === option.value ? "default" : "outline"}
                                    onClick={() => setPeriod(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {isLoading && <p>Loading report...</p>}
            
            {!isLoading && !reportData && <p>No data available for the selected period.</p>}

            {!isLoading && reportData && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard 
                            title="Total Revenue" 
                            value={reportData.summary.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'THB' })} 
                            icon={DollarSign} 
                            percentageChange={revenueChange}
                            periodText={periodText}
                            className="bg-sky-50"
                        />
                        <StatCard 
                            title="Sales Transactions" 
                            value={reportData.summary.totalSales.toLocaleString()} 
                            icon={ShoppingCart}
                            className="bg-fuchsia-50"
                        />
                        <StatCard 
                            title="Items Sold" 
                            value={reportData.summary.totalItemsSoldCount.toLocaleString()} 
                            icon={Package}
                            percentageChange={itemsSoldCount}
                            periodText={periodText}
                            className="bg-amber-50"
                        />
                        <StatCard 
                            title="Unique Customers" 
                            value={reportData.summary.totalUniqueCustomers.toLocaleString()} 
                            icon={Users}
                            className="bg-emerald-50"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sales Revenue</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[350px] w-full pl-0">
                                <ResponsiveContainer>
                                    <BarChart data={reportData.salesOverTime}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value > 1000 ? `${(value/1000).toFixed(0)}k` : value}`} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <TopListCard 
                            title="Top 10 Selling Products"
                            data={reportData.top10Products}
                            icon={TrendingUp}
                            columns={topProductsColumns}
                         />
                         <TopListCard 
                            title="Top 10 Customers"
                            data={reportData.top10Customers}
                            icon={Crown}
                            columns={topCustomersColumns}
                         />
                    </div>
                </>
            )}
        </div>
    );
}