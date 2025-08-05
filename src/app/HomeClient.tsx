"use client";

import { useState, useRef, type ChangeEvent, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  LoaderCircle,
  RefreshCw,
  Atom,
  Droplets,
  Contrast,
  Percent,
  Box,
  Sparkles,
  AlertTriangle,
  Wand2,
  Send,
  ListOrdered,
  MessageCircleQuestion,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StlParser } from "@/lib/stl-parser";
import { consultAI } from "@/ai/flows/consult-flow";
import {
  type ConsultationInput,
  type ConsultationOutput,
  OrderInputSchema,
  type OrderInput,
} from "@/ai/schema";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { processOrder } from "@/ai/flows/order-flow";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import STLViewer on client-side only to avoid SSR issues with React-Three-Fiber
const STLViewer = dynamic(() => import("@/components/ui/STLViewer").then(m => m.STLViewer), { ssr: false });

const In3dLogo = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.9619 23.6301L14.632 27.2341C15.1161 27.8721 16.1242 27.8721 16.6083 27.2341L19.2783 23.6301"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.6201 19.3398V27.4268"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.2783 8.36987L16.6083 4.76587C16.1242 4.12787 15.1161 4.12787 14.632 4.76587L11.9619 8.36987"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.6201 4.57227V12.6593"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.36987 19.2783L4.76587 16.6083C4.12787 16.1242 4.12787 15.1161 4.76587 14.632L8.36987 11.9619"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.57227 15.6201H12.6593"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23.6301 11.9619L27.2341 14.632C27.8721 15.1161 27.8721 16.1242 27.2341 16.6083L23.6301 19.2783"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M27.4268 15.6201H19.3398"
      stroke="#0891b2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BackgroundPattern = () => (
  <>
    <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:hidden"></div>
    <div className="absolute inset-0 -z-10 h-full w-full bg-gray-950 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] hidden dark:block"></div>
  </>
);

type PrintTechnology = "fdm" | "resin";
interface CalculationOutput {
  volume: number;
  surfaceArea: number;
}
const DENSITY_FDM = 1.25;
const DENSITY_RESIN = 1.15;
const SUPPORT_COST_FACTOR = 1.15;
const COST_PER_GRAM_FDM = 1000;
const COST_PER_GRAM_RESIN = 4000;

export default function HomeClient() {
  // --- state & hooks (copied from original) ---
  const [results, setResults] = useState<CalculationOutput | null>(null);
  const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  const [technology, setTechnology] = useState<PrintTechnology>("fdm");
  const [infillPercentage, setInfillPercentage] = useState<number>(20);
  const [shellThickness, setShellThickness] = useState<number>(2.0);

  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [consultationResult, setConsultationResult] =
    useState<ConsultationOutput | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(
    null
  );
  const [userPrompt, setUserPrompt] = useState<string>("");

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // ---- handlers ----
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      setFileContent(buf);

      // Calculate volume & surface area using parser
      try {
        const parser = new StlParser();
        const { volume, surfaceArea } = parser.parse(Buffer.from(buf));
        const materialDensity = technology === "fdm" ? DENSITY_FDM : DENSITY_RESIN;
        const materialCostPerGram = technology === "fdm" ? COST_PER_GRAM_FDM : COST_PER_GRAM_RESIN;
        // simple formula: weight = volume * density; cost = weight * cost/gram * support factor
        const weightGrams = volume * materialDensity * (1 + SUPPORT_COST_FACTOR * (infillPercentage / 100));
        const cost = weightGrams * materialCostPerGram;
        setResults({ volume, surfaceArea, cost });
      } catch (err) {
        console.error(err);
        toast({ title: "Không thể phân tích STL", description: "Vui lòng chọn tệp STL hợp lệ." , variant:"destructive"});
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    setResults(null);
    setFileContent(null);
    setFileName("");
    setProgress(0);
  };

  const form = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
    },
  });

  // --- useEffects to recalculate cost ---
  useEffect(() => {
    if (fileContent && results) {
      try {
        const materialDensity = technology === "fdm" ? DENSITY_FDM : DENSITY_RESIN;
        const materialCostPerGram = technology === "fdm" ? COST_PER_GRAM_FDM : COST_PER_GRAM_RESIN;

        const weightGrams = results.volume * materialDensity * (1 + SUPPORT_COST_FACTOR * (infillPercentage / 100));
        const cost = weightGrams * materialCostPerGram;

        setResults(prev => prev ? ({ ...prev, cost }) : null);
      } catch (err) {
        console.error("Failed to recalculate cost:", err);
      }
    }
  }, [technology, infillPercentage, fileContent, results?.volume]);

  const estimatedPrice = results?.cost 
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(results.cost)
    : "N/A";

  return (
    <div className="relative min-h-screen w-full font-sans text-gray-800 dark:text-gray-200">
      <BackgroundPattern />
      {/* --- HEADER --- */}
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200/80 dark:border-gray-800/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <In3dLogo />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">in3D</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                asChild
                className="dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <Link href="/orders">
                  <ListOrdered className="mr-2 h-4 w-4" />
                  Quản lý Đơn hàng
                </Link>
              </Button>
              <Button
                variant="outline"
                className="dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                Đăng nhập
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN --- */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* trạng thái ban đầu */}
        {!results && !isLoading && (
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              Ước tính chi phí in 3D
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Tải lên tệp .STL để nhận ngay báo giá tức thì và xem trước mô hình 3D của bạn.
            </p>
            {/* khu vực kéo thả */}
            <div
              className="relative mt-8 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-50/50 dark:hover:border-cyan-400/50 dark:hover:bg-gray-800/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  handleFileChange({ target: { files } } as any);
                }
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".stl"
              />
              <div className="mb-4 text-cyan-600 dark:text-cyan-400">
                <Upload className="h-12 w-12" />
              </div>
              <Button
                onClick={handleUploadClick}
                size="lg"
                className="font-bold text-base text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
              >
                Chọn tệp STL
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                hoặc kéo và thả tệp vào đây
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                Hỗ trợ STL nhị phân & ASCII. Tối đa 50MB.
              </p>
            </div>
          </div>
        )}

        {/* loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4 p-6 min-h-[300px]">
            <LoaderCircle className="h-10 w-10 animate-spin text-cyan-600" />
            <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
              Đang xử lý
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                {fileName}
              </span>
            </p>
            <Progress value={progress} className="w-full max-w-sm" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quá trình này có thể mất một chút thời gian...
            </p>
          </div>
        )}

        {/* đã có kết quả */}
        {results && !isLoading && (
          <div className="max-w-7xl mx-auto">
            {/* thanh info + reset */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4 overflow-hidden bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border dark:border-gray-700/80 rounded-lg p-3 shadow-sm">
                <Box className="w-8 h-8 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                <div className="flex-grow overflow-hidden">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-200 truncate" title={fileName}>
                    {fileName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Đã sẵn sàng để cấu hình và báo giá
                  </p>
                </div>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                className="font-semibold bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm dark:text-gray-300 dark:border-gray-700/80 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tải tệp khác
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* viewer */}
              <div className="lg:col-span-1 aspect-square relative">
                {fileContent && <STLViewer fileContent={fileContent} />}
              </div>

              {/* options + quote */}
              <div className="lg:col-span-1 space-y-8">
                {/* options card */}
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

              {/* AI Consultation */}
              {/* (Giữ nguyên phần tư vấn AI) */}
            </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white/80 dark:bg-gray-950/80 border-t mt-auto border-gray-200/80 dark:border-gray-800/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} in3D. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
