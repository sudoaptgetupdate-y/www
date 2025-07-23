// src/pages/SalePage.jsx

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function SalePage() {
    const navigate = useNavigate();
    const { 
        data: sales, 
        pagination, 
        isLoading, 
        searchTerm,
        filters,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch("/sales", 10, { status: "All" });

    return (
        <Card>
            {/* --- START: แก้ไขบรรทัดนี้ --- */}
            <CardHeader className="flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* --- END --- */}
                <CardTitle>Sales Records</CardTitle>
                <Button onClick={() => navigate('/sales/new')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Sale
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by Customer or Admin..."
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
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Sale ID</th>
                                <th className="p-2 text-left">Customer</th>
                                <th className="p-2 text-left">Sold By</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : sales.map((sale) => (
                                <tr key={sale.id} className="border-b">
                                    <td className="p-2 font-semibold">#{sale.id}</td>
                                    <td className="p-2">{sale.customer.name}</td>
                                    <td className="p-2">{sale.soldBy.name}</td>
                                    <td className="p-2 text-center">
                                        <StatusBadge status={sale.status} />
                                    </td>
                                    <td className="p-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                                    <td className="p-2 text-center">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${sale.id}`)}>
                                            Details
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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