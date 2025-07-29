'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ListOrdered } from 'lucide-react';
import { type OrderInput } from '@/ai/schema';

// Define a type for our order data, extending OrderInput and adding createdAt
interface OrderData extends OrderInput {
    createdAt: {
        seconds: number;
        nanoseconds: number;
    } | null;
}

async function getOrders(): Promise<OrderData[]> {
    try {
        const ordersRef = collection(db, 'orders');
        // Order by creation date, descending
        const q = query(ordersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const orders = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as OrderData));
        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}

function formatCurrency(amount: number) {
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function formatDate(timestamp: OrderData['createdAt']) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('vi-VN');
}

export default async function OrdersPage() {
    const orders = await getOrders();

    return (
        <div className="min-h-screen w-full bg-background text-foreground">
             <header className="bg-card border-b border-border">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-2">
                           <ListOrdered className="w-8 h-8 text-primary" />
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Quản lý Đơn hàng</h1>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" asChild>
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4"/>
                                    Trang chủ
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách Đơn hàng</CardTitle>
                        <CardDescription>
                            {orders.length > 0 ? `Tổng cộng có ${orders.length} đơn hàng đã được ghi nhận.` : 'Chưa có đơn hàng nào.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {orders.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Ngày đặt</TableHead>
                                        <TableHead>Khách hàng</TableHead>
                                        <TableHead>Liên hệ</TableHead>
                                        <TableHead>Chi tiết đơn hàng</TableHead>
                                        <TableHead className="text-right">Tổng tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{formatDate(order.createdAt)}</TableCell>
                                            <TableCell>
                                                <div className="font-bold">{order.customerName}</div>
                                                <div className="text-sm text-muted-foreground">{order.customerAddress}</div>
                                            </TableCell>
                                             <TableCell>
                                                <div>{order.customerPhone}</div>
                                                <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{order.orderDetails?.fileName}</div>
                                                 <div className="text-sm text-muted-foreground">
                                                    <Badge variant="outline" className="mr-2">
                                                        {order.orderDetails?.technology.toUpperCase()}
                                                    </Badge>
                                                    {order.orderDetails?.technology === 'fdm'
                                                        ? `Infill: ${order.orderDetails?.infillPercentage}%`
                                                        : `Shell: ${order.orderDetails?.shellThickness}mm`}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {formatCurrency(order.orderDetails?.estimatedCost ?? 0)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>Khi có khách hàng đặt đơn, thông tin sẽ được hiển thị tại đây.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
