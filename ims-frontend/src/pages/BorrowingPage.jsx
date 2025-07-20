// src/pages/BorrowingPage.jsx

import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle } from "lucide-react";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
        <td className="p-2 text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function BorrowingPage() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const { 
        data: borrowings, 
        pagination, 
        isLoading, 
        searchTerm,
        filters,
        handleSearchChange, 
        handlePageChange, 
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch("/borrowings", 10, { status: "All" });

    const getStatusVariant = (status) => {
        switch (status) {
            case 'BORROWED': return 'warning';
            case 'RETURNED': return 'secondary';
            case 'OVERDUE': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Borrowing Records</CardTitle>
                {canManage && (
                    <Button onClick={() => navigate('/borrowings/new')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Borrowing
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by Customer, Admin, or Serial Number..."
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
                            <SelectItem value="BORROWED">Borrowed</SelectItem>
                            <SelectItem value="RETURNED">Returned</SelectItem>
                            <SelectItem value="OVERDUE">Overdue</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                         <colgroup>
                            <col className="w-[20%]" />
                            <col className="w-[15%]" />
                            <col className="w-[15%]" />
                            <col className="w-[120px]" />
                            <col className="w-[15%]" />
                            <col className="w-[20%]" />
                            <col className="w-[100px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">Customer</th>
                                <th className="p-2 text-left">Borrow Date</th>
                                <th className="p-2 text-left">Due Date</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-center">Item Status</th>
                                <th className="p-2 text-left">Approved By</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : borrowings.map((b) => (
                                <tr key={b.id} className="border-b">
                                    <td className="p-2">{b.borrower.name}</td>
                                    <td className="p-2">{new Date(b.borrowDate).toLocaleDateString()}</td>
                                    <td className="p-2">{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-2 text-center">
                                        <Badge variant={getStatusVariant(b.status)} className="w-24 justify-center">{b.status}</Badge>
                                    </td>
                                    <td className="p-2 text-center">{b.returnedItemCount}/{b.totalItemCount} Returned</td>
                                    <td className="p-2">{b.approvedBy.name}</td>
                                    <td className="p-2 text-center">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/borrowings/${b.id}`)}>
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