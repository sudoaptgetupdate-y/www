// src/pages/BorrowingPage.jsx

import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"; // --- 1. เพิ่ม CardDescription ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, ArrowUpDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"; // --- 2. Import Table Components ---


// --- 3. แก้ไข SkeletonRow ---
const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

// --- 4. แก้ไข SortableHeader ---
const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort }) => (
    <TableHead className="p-2 text-left cursor-pointer hover:bg-slate-50" onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);

export default function BorrowingPage() {
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const location = useLocation();
    const initialStatus = location.state?.status || "All";

    const { 
        data: borrowings, 
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
    } = usePaginatedFetch("/borrowings", 10, { status: initialStatus });

    return (
        <Card>
            {/* --- 5. แก้ไข CardHeader --- */}
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Borrowing Records</CardTitle>
                        <CardDescription>Track and manage all borrowing and return records.</CardDescription>
                    </div>
                    {canManage && (
                        <Button onClick={() => navigate('/borrowings/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Borrowing
                        </Button>
                    )}
                </div>
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
                {/* --- 6. แก้ไขโครงสร้างตาราง --- */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHeader sortKey="id" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Record ID
                            </SortableHeader>
                            <SortableHeader sortKey="customer" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Customer
                            </SortableHeader>
                            <SortableHeader sortKey="borrowDate" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Borrow Date
                            </SortableHeader>
                            <SortableHeader sortKey="dueDate" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                Due Date
                            </SortableHeader>
                            <TableHead className="p-2 text-center">Status</TableHead>
                            <TableHead className="p-2 text-center">Item Status</TableHead>
                            <TableHead className="p-2 text-left">Approved By</TableHead>
                            <TableHead className="p-2 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                        ) : borrowings.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell>#{b.id}</TableCell>
                                <TableCell>{b.borrower?.name || 'N/A'}</TableCell>
                                <TableCell>{new Date(b.borrowDate).toLocaleDateString()}</TableCell>
                                <TableCell>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge 
                                        status={b.status} 
                                        className="w-24" 
                                        onClick={() => navigate(`/borrowings/${b.id}`)}
                                        interactive
                                    />
                                </TableCell>
                                <TableCell className="text-center">{b.returnedItemCount}/{b.totalItemCount} Returned</TableCell>
                                <TableCell>{b.approvedBy?.name || 'N/A'}</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/borrowings/${b.id}`)}>
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