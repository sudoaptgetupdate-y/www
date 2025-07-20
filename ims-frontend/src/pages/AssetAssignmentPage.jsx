// src/pages/AssetAssignmentPage.jsx

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
        <td className="p-2 text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

export default function AssetAssignmentPage() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const { 
        data: assignments, 
        pagination, 
        isLoading, 
        handlePageChange,
        handleItemsPerPageChange
    } = usePaginatedFetch("/asset-assignments");

    const getStatusVariant = (status) => {
        switch (status) {
            case 'ASSIGNED': return 'warning';
            case 'RETURNED': return 'secondary';
            case 'PARTIALLY_RETURNED': return 'info';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Asset Assignments</CardTitle>
                {canManage && (
                    <Button onClick={() => navigate('/asset-assignments/new')}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Assignment
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                         <colgroup>
                            <col className="w-[10%]" />
                            <col className="w-[25%]" />
                            <col className="w-[20%]" />
                            <col className="w-[140px]" />
                            <col className="w-[15%]" />
                            <col className="w-[100px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left">ID</th>
                                <th className="p-2 text-left">Assignee</th>
                                <th className="p-2 text-left">Assigned Date</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-center">Item Status</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : assignments.map((a) => (
                                <tr key={a.id} className="border-b">
                                    <td className="p-2 font-semibold">#{a.id}</td>
                                    <td className="p-2">{a.assignee.name}</td>
                                    <td className="p-2">{new Date(a.assignedDate).toLocaleDateString()}</td>
                                    <td className="p-2 text-center">
                                        <Badge variant={getStatusVariant(a.status)} className="w-32 justify-center">{a.status}</Badge>
                                    </td>
                                    <td className="p-2 text-center">{a.returnedItemCount}/{a.totalItemCount} Returned</td>
                                    <td className="p-2 text-center">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/asset-assignments/${a.id}`)}>
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