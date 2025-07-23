// src/pages/SaleDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// --- START: เพิ่มการ import ---
import { ArrowLeft, Edit, FileText, AlertTriangle, Printer } from "lucide-react";
// --- END ---
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const InfoCard = ({ title, value }) => (
    <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="font-semibold">{value}</p>
    </div>
);

export default function SaleDetailPage() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const [sale, setSale] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const canVoid = currentUser?.role === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchSale = async () => {
            if (!saleId || !token) return;
            try {
                const response = await axiosInstance.get(`/sales/${saleId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSale(response.data);
            } catch (error) {
                toast.error("Failed to fetch sale details.");
            } finally {
                setLoading(false);
            }
        };
        fetchSale();
    }, [saleId, token]);

    const handleVoidSale = async () => {
        try {
            await axiosInstance.patch(`/sales/${saleId}/void`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Sale has been voided successfully.");
            // Refetch data to show updated status
            const response = await axiosInstance.get(`/sales/${saleId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSale(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to void sale.");
        } finally {
            setIsAlertOpen(false);
        }
    };

    if (loading) return <p>Loading sale details...</p>;
    if (!sale) return <p>Sale not found.</p>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6" /> Sale Details
                    </h1>
                    <p className="text-muted-foreground">
                        Viewing details for Sale ID #{sale.id}
                    </p>
                </div>
                {/* --- START: แก้ไขส่วนนี้ --- */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/sales')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    {canVoid && sale.status === 'COMPLETED' && (
                        <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Void Sale
                        </Button>
                    )}
                </div>
                {/* --- END --- */}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Sale Information</CardTitle>
                        <StatusBadge status={sale.status} />
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <InfoCard title="Customer" value={sale.customer.name} />
                    <InfoCard title="Sold By" value={sale.soldBy.name} />
                    <InfoCard title="Sale Date" value={new Date(sale.saleDate).toLocaleString()} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Items Sold ({sale.itemsSold.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2 text-left">Product Model</th>
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-left">Brand</th>
                                    <th className="p-2 text-left">Serial Number</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.itemsSold.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2">{item.productModel.category.name}</td>
                                        <td className="p-2">{item.productModel.brand.name}</td>
                                        <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-right">
                    <p>Subtotal: <strong>{sale.subtotal.toFixed(2)}</strong></p>
                    <p>VAT (7%): <strong>{sale.vatAmount.toFixed(2)}</strong></p>
                    <p className="text-lg font-bold">Total: <strong>{sale.total.toFixed(2)}</strong></p>
                </CardContent>
            </Card>

            {sale.status === 'VOIDED' && (
                <Card className="border-red-500">
                    <CardHeader>
                        <CardTitle className="text-red-600">Void Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <InfoCard title="Voided By" value={sale.voidedBy?.name || 'N/A'} />
                        <InfoCard title="Voided Date" value={new Date(sale.voidedAt).toLocaleString()} />
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will void Sale ID #{sale.id}. The items in this sale will be returned to stock. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVoidSale}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}