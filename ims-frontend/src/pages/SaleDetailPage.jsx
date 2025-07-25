// src/pages/SaleDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, FileText, AlertTriangle, Printer } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <p>Loading sale details...</p>;
    if (!sale) return <p>Sale not found.</p>;
    
    const formattedSaleId = sale.id.toString().padStart(6, '0');

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
                <div>
                    {/* --- START: ปรับปรุง Header --- */}
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6" /> 
                        Sale Details
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Viewing details for Sale ID #{formattedSaleId}
                    </p>
                    {/* --- END --- */}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/sales')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Sales List
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / PDF
                    </Button>
                    {canVoid && sale.status === 'COMPLETED' && (
                        <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Void Sale
                        </Button>
                    )}
                </div>
            </div>

            <Card className="printable-area p-4 sm:p-6 md:p-8 font-sarabun">
                <div className="print-header hidden">
                    <h1 className="text-xl font-bold">ใบกำกับภาษีอย่างย่อ / ใบเสร็จรับเงิน</h1>
                    <p className="text-sm">ศูนย์การขายและวิศวกรรมบริการ</p>
                    <p className="text-sm">บริษัทโทรคมนาคมแห่งชาติ จำกัด(มหาชน)</p>
                    <p className="text-xs">เลขที่2 ซอยพิพิธภัณฑ์ ตำบลในเมือง อำเภอเมือง นครศรีธรรมราช 80000 โทรศัพท์ 075-345456</p>
                </div>
                
                <CardHeader className="p-0 mb-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">ลูกค้า (Customer)</p>
                            <p className="font-semibold">{sale.customer.name}</p>
                            <p className="text-sm text-muted-foreground">{sale.customer.address || ""}</p>
                            <p className="text-sm text-muted-foreground">โทร. {sale.customer.phone || "-"}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-sm text-muted-foreground">เลขที่ (Sale ID)</p>
                            <p className="font-semibold">#{formattedSaleId}</p>
                            <p className="text-sm text-muted-foreground">วันที่ (Date)</p>
                            <p className="font-semibold">{new Date(sale.saleDate).toLocaleString('th-TH')}</p>
                            <p className="text-sm text-muted-foreground">พนักงานขาย (Sold By)</p>
                            <p className="font-semibold">{sale.soldBy.name}</p>
                        </div>
                    </div>
                     <div className="mt-4 flex justify-end no-print">
                        <StatusBadge status={sale.status} className="w-28 text-base" />
                    </div>
                </CardHeader>

                {sale.status === 'VOIDED' && (
                    <Card className="border-red-500 my-4 bg-red-50/50 no-print">
                        <CardHeader>
                            <CardTitle className="text-red-600 text-base">Void Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm pb-4">
                            <div><p className="font-semibold">Voided By</p><p>{sale.voidedBy?.name || 'N/A'}</p></div>
                            <div><p className="font-semibold">Voided Date</p><p>{new Date(sale.voidedAt).toLocaleString()}</p></div>
                        </CardContent>
                    </Card>
                )}

                <CardContent className="p-0 mt-6">
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40">
                                    <th className="p-2 text-left">รายการ (Product)</th>
                                    <th className="p-2 text-left">หมวดหมู่ (Category)</th>
                                    <th className="p-2 text-left">ยี่ห้อ (Brand)</th>
                                    <th className="p-2 text-left">Serial Number</th>
                                    <th className="p-2 text-right">ราคา (Price)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.itemsSold.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.productModel.modelNumber}</td>
                                        <td className="p-2">{item.productModel.category.name}</td>
                                        <td className="p-2">{item.productModel.brand.name}</td>
                                        <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                        <td className="p-2 text-right">{item.productModel.sellingPrice.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t font-semibold">
                                    <td colSpan="4" className="p-2 text-right">รวมเป็นเงิน (Subtotal)</td>
                                    <td className="p-2 text-right">{sale.subtotal.toFixed(2)}</td>
                                </tr>
                                <tr className="border-t">
                                    <td colSpan="4" className="p-2 text-right">ภาษีมูลค่าเพิ่ม (VAT 7%)</td>
                                    <td className="p-2 text-right">{sale.vatAmount.toFixed(2)}</td>
                                </tr>
                                <tr className="border-t text-base font-bold bg-muted/40">
                                    <td colSpan="4" className="p-2 text-right">ยอดสุทธิ (Total)</td>
                                    <td className="p-2 text-right">{sale.total.toFixed(2)} THB</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
                
                <div className="signature-section hidden">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {sale.soldBy.name} )</p>
                        <p>ผู้ขาย</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {sale.customer.name} )</p>
                        <p>ผู้ซื้อ</p>
                    </div>
                </div>

                <div className="print-footer hidden text-center text-xs text-muted-foreground mt-8">
                     <p>ขอบคุณที่ใช้บริการ</p>
                     <p>Thank you for your business!</p>
                </div>
            </Card>

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
