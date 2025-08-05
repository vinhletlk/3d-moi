"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send } from "lucide-react";

interface CalculationOutput {
  volume: number;
  surfaceArea: number;
  cost: number;
}

interface OrderDialogProps {
  results: CalculationOutput;
  estimatedPrice: string;
}

export const OrderDialog = ({ results, estimatedPrice }: OrderDialogProps) => {
  return (
    <Dialog>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Báo giá ước tính</CardTitle>
          <CardDescription>
            Chi phí cuối cùng có thể thay đổi sau khi xem xét thủ công.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium text-gray-600 dark:text-gray-300">Thể tích vật thể:</span>
            <span className="font-mono text-gray-900 dark:text-white">{results.volume.toFixed(2)} cm³</span>
          </div>
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium text-gray-600 dark:text-gray-300">Diện tích bề mặt:</span>
            <span className="font-mono text-gray-900 dark:text-white">{results.surfaceArea.toFixed(2)} cm²</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
          <div className="flex justify-between items-center text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
            <span>Tổng cộng:</span>
            <span>{estimatedPrice}</span>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <DialogTrigger asChild>
            <Button size="lg" className="w-full font-bold text-lg">
              <Send className="mr-2 h-5 w-5" />
              Đặt hàng ngay
            </Button>
          </DialogTrigger>
        </CardFooter>
      </Card>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận đơn hàng</DialogTitle>
          <DialogDescription>
            Vui lòng điền thông tin để hoàn tất đặt hàng.
          </DialogDescription>
        </DialogHeader>
        {/* Order Form will go here */}
      </DialogContent>
    </Dialog>
  );
};
