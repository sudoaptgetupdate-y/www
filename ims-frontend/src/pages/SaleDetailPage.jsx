// src/pages/SaleDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Printer } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/StatusBadge"; 

export default function SaleDetailPage() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);
    const [sale, setSale] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSaleDetails = async () => {
            if (!saleId || !token) return;
            try {
                setLoading(true);
                const response = await axiosInstance.get(`/sales/${saleId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSale(response.data);
            } catch (error) {
                toast.error("Failed to fetch sale details.");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSaleDetails();
    }, [saleId, token]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <p>Loading sale details...</p>;
    }

    if (!sale) {
        return <p>Sale not found.</p>;
    }

    const isVoided = sale.status === 'VOIDED';

    return (
        <div className="space-y-6 printable-area">
            <div className="flex justify-between items-center no-print">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            </div>
            
            <div className="print-header hidden">
                <h1>ใบเสร็จรับเงิน / Sale Invoice</h1>
                <p>เอกสารฉบับนี้เป็นการยืนยันการทำรายการขาย</p>
            </div>

            {isVoided && (
                <div className="flex items-center gap-4 rounded-lg border border-destructive bg-red-50 p-4 no-print">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <div className="text-sm">
                        <p className="font-bold text-destructive">This sale has been voided.</p>
                        <p className="text-red-800">
                            {/* --- START: ส่วนที่แก้ไข --- */}
                            Voided by: {sale.voidedBy?.name || 'N/A'} on {new Date(sale.voidedAt).toLocaleString()}
                            {/* --- END --- */}
                        </p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Sale Details</span>
                        <StatusBadge status={sale.status} />
                    </CardTitle>
                    <CardDescription>Sale ID: {sale.id}</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4 text-sm print:flex print:justify-between">
                    <div>
                        <p className="font-semibold">Customer</p>
                        {/* --- START: ส่วนที่แก้ไข --- */}
                        <p>{sale.customer?.name || 'N/A'}</p>
                        {/* --- END --- */}
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 print:text-right">
                         <div>
                            <p className="font-semibold">Sale Date</p>
                            <p>{new Date(sale.saleDate).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Sold By</p>
                            {/* --- START: ส่วนที่แก้ไข --- */}
                            <p>{sale.soldBy?.name || 'N/A'}</p>
                            {/* --- END --- */}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Items Sold ({sale.itemsSold.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2">Brand</th>
                                <th className="p-2">Product Model</th>
                                <th className="p-2">Serial Number</th>
                                <th className="p-2 text-right">Price (Pre-VAT)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.itemsSold.map(item => (
                                <tr key={item.id} className="border-b">
                                    {/* --- START: ส่วนที่แก้ไข --- */}
                                    <td className="p-2">{item.productModel?.brand?.name || 'N/A'}</td>
                                    <td className="p-2">{item.productModel?.modelNumber || 'N/A'}</td>
                                    {/* --- END --- */}
                                    <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                    <td className="p-2 text-right">{item.productModel?.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex justify-end pt-4">
                        <div className="w-full max-w-sm space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{sale.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">VAT (7%)</span>
                                <span>{sale.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total Price</span>
                                <span>{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="signature-section hidden">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <p>( ..................................................... )</p>
                    <p>เจ้าหน้าที่</p>
                </div>
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <p>( ..................................................... )</p>
                    <p>ลูกค้า</p>
                </div>
            </div>
        </div>
    );
}