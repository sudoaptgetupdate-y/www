// src/pages/SalePage.jsx

import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, ArrowUpDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge"; 
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse"></div></TableCell>
    </TableRow>
);

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);

export default function SalePage() {
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const { 
        data: sales, 
        pagination, 
        isLoading, 
        searchTerm,
        filters,
        sortBy,
        sortOrder,
        handleSortChange,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch("/sales", 10, { status: "All" });

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Sale Records</CardTitle>
                        <CardDescription>View and manage all sale transactions.</CardDescription>
                    </div>
                    {canManage && (
                        <Button onClick={() => navigate('/sales/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Sale
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by Customer, Seller, or Sale ID..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by Status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="VOIDED">Voided</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHeader sortKey="id" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Sale ID
                            </SortableHeader>
                            <SortableHeader sortKey="customer" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Customer
                            </SortableHeader>
                            <SortableHeader sortKey="saleDate" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Sale Date
                            </SortableHeader>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Items</TableHead>
                            <SortableHeader sortKey="total" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Total (inc. VAT)
                            </SortableHeader>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                        ) : sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell>#{sale.id}</TableCell>
                                <TableCell>{sale.customer?.name || 'N/A'}</TableCell>
                                <TableCell>{new Date(sale.saleDate).toLocaleString()}</TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge 
                                        status={sale.status} 
                                        className="w-24" 
                                        onClick={() => navigate(`/sales/${sale.id}`)}
                                        interactive
                                    />
                                </TableCell>
                                <TableCell className="text-center">{sale.itemsSold.length}</TableCell>
                                <TableCell className="text-right">{sale.total.toLocaleString('en-US')} THB</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
                                        Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
             <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">Rows per page:</Label>
                    <Select value={String(pagination.itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} items)
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>Next</Button>
                </div>
            </CardFooter>
        </Card>
    );
}