// src/components/dialogs/CustomerPurchaseHistoryDialog.jsx

import { useEffect, useState } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function CustomerPurchaseHistoryDialog({ customer, open, onOpenChange }) {
    const token = useAuthStore((state) => state.token);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customer && open) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    const response = await axiosInstance.get(`/customers/${customer.id}/sales`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setHistory(response.data);
                } catch (error) {
                    toast.error("Failed to fetch purchase history.");
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [customer, open, token]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Purchase History: {customer?.name}</DialogTitle>
                    <DialogDescription>
                        Showing all items purchased by {customer?.name} ({customer?.customerCode}).
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
                    {loading ? (
                        <p>Loading history...</p>
                    ) : history.length > 0 ? (
                        history.map((sale) => (
                            <div key={sale.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-baseline mb-2">
                                    <p className="font-semibold">Sale ID: {sale.id}</p>
                                    <p className="text-sm text-slate-500">{new Date(sale.saleDate).toLocaleDateString()}</p>
                                </div>
                                <Separator />
                                <ul className="mt-2 space-y-1 text-sm">
                                    {sale.itemsSold.map(item => (
                                        <li key={item.id} className="flex justify-between">
                                            <span>{item.productModel.modelNumber} ({item.serialNumber})</span>
                                            <span className="font-mono">{item.productModel.sellingPrice.toLocaleString()} THB</span>
                                        </li>
                                    ))}
                                </ul>
                                <Separator className="my-2"/>
                                <div className="flex justify-end font-bold">
                                    Total: {sale.total.toLocaleString('en-US', {minimumFractionDigits: 2})} THB
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>This customer has no purchase history.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}