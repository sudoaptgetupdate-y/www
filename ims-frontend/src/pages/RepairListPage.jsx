// src/pages/RepairListPage.jsx

import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"; // --- 1. เพิ่ม CardDescription ---
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"; // --- 2. Import Table Components ---

// --- 3. แก้ไข SkeletonRow ---
const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function RepairListPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const location = useLocation();
    const initialStatus = location.state?.status || "All";

    const {
        data: repairs,
        pagination,
        isLoading,
        searchTerm,
        filters,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch("/repairs", 10, { status: initialStatus });

    return (
        <Card>
            {/* --- 4. แก้ไข CardHeader --- */}
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{t('repairOrders')}</CardTitle>
                        <CardDescription>Manage all items sent for repair.</CardDescription>
                    </div>
                     {canManage && (
                        <Button onClick={() => navigate('/repairs/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Repair Order
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder="Search by Order ID, Sender, or Receiver..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="Filter by Status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="REPAIRING">Repairing</SelectItem>
                            <SelectItem value="PARTIALLY_RETURNED">Partially Returned</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* --- 5. แก้ไขโครงสร้างตาราง --- */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('tableHeader_repairId')}</TableHead>
                            <TableHead>{t('tableHeader_sentTo')}</TableHead>
                            <TableHead>{t('tableHeader_repairDate')}</TableHead>
                            <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                            <TableHead className="text-center">{t('tableHeader_itemStatus')}</TableHead>
                            <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                        ) : repairs.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>#{r.id}</TableCell>
                                <TableCell>{r.receiver?.name || 'N/A'}</TableCell>
                                <TableCell>{new Date(r.repairDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-center">
                                    <StatusBadge
                                        status={r.status}
                                        className="w-32"
                                        onClick={() => navigate(`/repairs/${r.id}`)}
                                        interactive
                                    />
                                </TableCell>
                                <TableCell className="text-center">{r.returnedItemCount}/{r.totalItemCount} Returned</TableCell>
                                <TableCell className="text-center">
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/repairs/${r.id}`)}>
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