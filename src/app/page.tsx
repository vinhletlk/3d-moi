"use client";

import { useState, useRef, type ChangeEvent, useEffect } from "react";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Upload, LoaderCircle, Ruler, Shell, RefreshCw, Atom, Droplets, Contrast, Percent, Weight, Box, Sparkles, AlertTriangle, Wand2, Send, ListOrdered, MessageCircleQuestion } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StlParser } from "@/lib/stl-parser";
import { consultAI } from "@/ai/flows/consult-flow";
import { type ConsultationInput, type ConsultationOutput, OrderInputSchema, type OrderInput } from "@/ai/schema";
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { processOrder } from "@/ai/flows/order-flow";
import { Textarea } from "@/components/ui/textarea";
import Link from 'next/link';
import { STLViewer } from '@/components/ui/STLViewer';


const In3dLogo = () => (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.9619 23.6301L14.632 27.2341C15.1161 27.8721 16.1242 27.8721 16.6083 27.2341L19.2783 23.6301" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.6201 19.3398V27.4268" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.2783 8.36987L16.6083 4.76587C16.1242 4.12787 15.1161 4.12787 14.632 4.76587L11.9619 8.36987" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.6201 4.57227V12.6593" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.36987 19.2783L4.76587 16.6083C4.12787 16.1242 4.12787 15.1161 4.76587 14.632L8.36987 11.9619" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.57227 15.6201H12.6593" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23.6301 11.9619L27.2341 14.632C27.8721 15.1161 27.8721 16.1242 27.2341 16.6083L23.6301 19.2783" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M27.4268 15.6201H19.3398" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
const SUPPORT_COST_FACTOR = 1.15; // 15% increase for supports
const COST_PER_GRAM_FDM = 1000;
const COST_PER_GRAM_RESIN = 4000;

export default function Home() {
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
  const [consultationResult, setConsultationResult] = useState<ConsultationOutput | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const form = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    defaultValues: {
      customerName: "",
      customerAddress: "",
    },
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      let progressValue = 0;
      timer = setInterval(() => {
        progressValue += 5;
        if (progressValue > 95) {
           clearInterval(timer);
        }
        setProgress(progressValue);
      }, 100);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isLoading]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast({
        variant: "destructive",
        title: "Loại tệp không hợp lệ",
        description: "Vui lòng tải lên một tệp .stl hợp lệ.",
      });
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setResults(null);
    setFileContent(null);
    setConsultationResult(null);
    setConsultationError(null);

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        setFileContent(buffer);

        const parser = new StlParser();
        const calculationResult = parser.parse(Buffer.from(buffer));

        setProgress(100);
        setTimeout(() => {
          setResults(calculationResult);
          setIsLoading(false);
        }, 300);
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Tính toán thất bại",
          description: error.message || "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
        });
        setFileName("");
        setIsLoading(false);
      }
    };
    reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          variant: "destructive",
          title: "Lỗi đọc tệp",
          description: "Không thể đọc tệp đã chọn.",
        });
        setIsLoading(false);
        setFileName("");
    };
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setResults(null);
    setFileContent(null);
    setIsLoading(false);
    setFileName("");
    setProgress(0);
    setConsultationResult(null);
    setConsultationError(null);
    setUserPrompt("");
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const calculateCost = () => {
    if (!results) return { weight: 0, totalCost: 0, costPerGram: 0, baseCost: 0, supportCost: 0 };
    
    let volume = 0;
    let density = 0;
    let costPerGram = 0;

    if (technology === 'fdm') {
      density = DENSITY_FDM;
      costPerGram = COST_PER_GRAM_FDM;
      volume = results.volume * (infillPercentage / 100);
    } else { // Resin
      density = DENSITY_RESIN;
      costPerGram = COST_PER_GRAM_RESIN;
      const thicknessInCm = shellThickness / 10;
      const shellVolume = results.surfaceArea * thicknessInCm;
      volume = Math.min(shellVolume, results.volume);
    }

    let weight = volume * density;
    let baseCost = weight * costPerGram;
    let supportCost = baseCost * (SUPPORT_COST_FACTOR - 1);
    let totalCost = baseCost + supportCost;
    
    let finalWeight = weight * SUPPORT_COST_FACTOR;

    return { weight: finalWeight, totalCost, costPerGram, baseCost, supportCost };
  };

  const { weight, totalCost, costPerGram, baseCost, supportCost } = calculateCost();

  const handleConsultation = async () => {
    if (!results) return;

    setIsConsulting(true);
    setConsultationResult(null);
    setConsultationError(null);

    const input: ConsultationInput = {
      fileName: fileName,
      technology: technology,
      volume: results.volume,
      surfaceArea: results.surfaceArea,
      estimatedWeight: weight,
      estimatedCost: totalCost,
      ...(technology === 'fdm'
        ? { infillPercentage: infillPercentage }
        : { shellThickness: shellThickness }),
      ...(userPrompt && { userPrompt: userPrompt }),
    };

    try {
      const response = await consultAI(input);
      setConsultationResult(response);
    } catch (error) {
      console.error("AI Consultation Error:", error);
      setConsultationError("Xin lỗi, đã có lỗi xảy ra khi kết nối với trợ lý AI. Vui lòng thử lại sau.");
    } finally {
      setIsConsulting(false);
    }
  };

  const applyAISuggestion = () => {
    if (!consultationResult) return;
    if (consultationResult.suggestedInfill !== undefined && technology === 'fdm') {
      setInfillPercentage(consultationResult.suggestedInfill);
      toast({ title: "Đã áp dụng đề xuất", description: `Độ rỗng đã được cập nhật thành ${consultationResult.suggestedInfill}%.` });
    }
    if (consultationResult.suggestedShellThickness !== undefined && technology === 'resin') {
      setShellThickness(consultationResult.suggestedShellThickness);
      toast({ title: "Đã áp dụng đề xuất", description: `Độ dày vỏ đã được cập nhật thành ${consultationResult.suggestedShellThickness.toFixed(1)}mm.` });
    }
  };

  const canApplySuggestion = consultationResult &&
    ((consultationResult.suggestedInfill !== undefined && technology === 'fdm') ||
     (consultationResult.suggestedShellThickness !== undefined && technology === 'resin'));
  
  const handleOrderSubmit = async (values: OrderInput) => {
    if (!results) return;
    setIsSubmittingOrder(true);
    
    const orderDetails: ConsultationInput = {
      fileName: fileName,
      technology: technology,
      volume: results.volume,
      surfaceArea: results.surfaceArea,
      estimatedWeight: weight,
      estimatedCost: totalCost,
      ...(technology === 'fdm'
        ? { infillPercentage: infillPercentage }
        : { shellThickness: shellThickness }),
    };

    try {
      const result = await processOrder({ ...values, orderDetails });
      if (result.success) {
        setIsOrderDialogOpen(false);
        form.reset();
        toast({
          title: "Đặt hàng thành công!",
          description: "Cảm ơn bạn. Chúng tôi sẽ sớm liên hệ để xác nhận.",
        });
      } else {
        throw new Error(result.error || 'Lỗi không xác định');
      }
    } catch (error: any) {
       console.error("Order submission error:", error);
       toast({
         variant: "destructive",
         title: "Lỗi đặt hàng",
         description: error.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau."
       });
    } finally {
        setIsSubmittingOrder(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) + ' đ';
  }

  return (
    <div className="relative min-h-screen w-full font-sans text-gray-800 dark:text-gray-200">
      <BackgroundPattern />
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200/80 dark:border-gray-800/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                    <In3dLogo />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">in3D</h1>
                </div>
                 <div className="flex items-center space-x-2">
                    <Button variant="ghost" asChild className="dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white">
                        <Link href="/orders">
                            <ListOrdered className="mr-2 h-4 w-4"/>
                            Quản lý Đơn hàng
                        </Link>
                    </Button>
                    <Button variant="outline" className="dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white">Đăng nhập</Button>
                </div>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {!results && !isLoading && (
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                    Ước tính chi phí in 3D
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                    Tải lên tệp .STL để nhận ngay báo giá tức thì và xem trước mô hình 3D của bạn.
                </p>
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
                  <Button onClick={handleUploadClick} size="lg" className="font-bold text-base text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105">
                    Chọn tệp STL
                  </Button>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">hoặc kéo và thả tệp vào đây</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Hỗ trợ STL nhị phân & ASCII. Tối đa 50MB.</p>
                </div>
            </div>
        )}

        {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4 p-6 min-h-[300px]">
              <LoaderCircle className="h-10 w-10 animate-spin text-cyan-600" />
              <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Đang xử lý <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">{fileName}</span></p>
              <Progress value={progress} className="w-full max-w-sm" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Quá trình này có thể mất một chút thời gian...</p>
            </div>
        )}
        
        {results && !isLoading && (
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4 overflow-hidden bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border dark:border-gray-700/80 rounded-lg p-3 shadow-sm">
                     <Box className="w-8 h-8 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                     <div className="flex-grow overflow-hidden">
                         <p className="text-base font-semibold text-gray-800 dark:text-gray-200 truncate" title={fileName}>{fileName}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">Đã sẵn sàng để cấu hình và báo giá</p>
                     </div>
                </div>
                <Button onClick={handleReset} variant="outline" className="font-semibold bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm dark:text-gray-300 dark:border-gray-700/80 dark:hover:bg-gray-800 dark:hover:text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tải tệp khác
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                <div className="lg:col-span-1 aspect-square relative">
                    {fileContent && (
                        <STLViewer fileContent={fileContent} />
                    )}
                </div>

                <div className="lg:col-span-1 space-y-8">
                  <Card className="shadow-md border-gray-200/80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm dark:border-gray-700/80">
                    <CardHeader>
                      <CardTitle className="text-xl">Tùy chọn in</CardTitle>
                      <CardDescription>Chọn công nghệ và tinh chỉnh các thông số để phù hợp với nhu cầu của bạn.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Công nghệ in</Label>
                        <RadioGroup
                          value={technology}
                          onValueChange={(value) => {
                              setTechnology(value as PrintTechnology);
                              setConsultationResult(null);
                              setConsultationError(null);
                          }}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div>
                            <RadioGroupItem value="fdm" id="fdm" className="peer sr-only" />
                            <Label htmlFor="fdm" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-cyan-600 [&:has([data-state=checked])]:border-cyan-600 cursor-pointer dark:peer-data-[state=checked]:border-cyan-500">
                              <Atom className="mb-2 h-6 w-6" /> FDM
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="resin" id="resin" className="peer sr-only" />
                            <Label htmlFor="resin" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-cyan-600 [&:has([data-state=checked])]:border-cyan-600 cursor-pointer dark:peer-data-[state=checked]:border-cyan-500">
                              <Droplets className="mb-2 h-6 w-6" /> Resin
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {technology === 'fdm' && (
                        <div className="space-y-3 pt-2">
                          <Label className="text-base font-medium flex items-center" htmlFor="infill">
                            <Percent className="mr-2 h-4 w-4" /> Độ rỗng (Infill)
                          </Label>
                          <div className="flex items-center space-x-4">
                            <Slider id="infill" value={[infillPercentage]} onValueChange={(value) => { setInfillPercentage(value[0]); setConsultationResult(null); setConsultationError(null); }} max={100} step={5} className="flex-1" />
                            <span className="text-lg font-bold w-16 text-right text-cyan-600 dark:text-cyan-400">{infillPercentage}%</span>
                          </div>
                        </div>
                      )}
                      {technology === 'resin' && (
                        <div className="space-y-3 pt-2">
                           <Label className="text-base font-medium flex items-center" htmlFor="shell">
                             <Contrast className="mr-2 h-4 w-4" /> Độ dày vỏ (Shell)
                          </Label>
                          <div className="flex items-center space-x-4">
                            <Slider id="shell" value={[shellThickness]} onValueChange={(value) => { setShellThickness(value[0]); setConsultationResult(null); setConsultationError(null); }} max={10} step={0.1} className="flex-1" />
                            <span className="text-lg font-bold w-16 text-right text-cyan-600 dark:text-cyan-400">{shellThickness.toFixed(1)} mm</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                   <Card className="shadow-lg border-cyan-200/80 dark:border-cyan-900/80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                      <CardHeader>
                         <CardTitle className="text-xl">Báo giá ước tính</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>Cân nặng ước tính</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{weight.toFixed(2)} g</span>
                        </div>
                         <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>Đơn giá vật liệu</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{costPerGram.toLocaleString('vi-VN')} đ/g</span>
                        </div>
                         <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>Chi phí vật liệu gốc</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(baseCost)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>Phí support (+15%)</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(supportCost)}</span>
                        </div>
                        <div className="border-t border-dashed my-3 dark:border-gray-700"></div>
                        <div className="flex justify-between items-center text-gray-900 dark:text-white pt-2">
                            <span className="text-lg font-bold">Tổng chi phí</span>
                            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">{formatCurrency(totalCost)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex-col items-stretch gap-3">
                        <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                          <DialogTrigger asChild>
                              <Button className="w-full font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105" size="lg">
                                  <Send className="mr-2 h-4 w-4" />
                                  Tiến hành Đặt hàng
                              </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[480px] dark:bg-gray-800 dark:text-gray-200">
                              <DialogHeader>
                                  <DialogTitle className="dark:text-white">Thông tin đặt hàng</DialogTitle>
                                  <DialogDescription>
                                      Vui lòng điền đầy đủ thông tin để chúng tôi có thể giao hàng cho bạn.
                                  </DialogDescription>
                              </DialogHeader>
                              <Form {...form}>
                                  <form onSubmit={form.handleSubmit(handleOrderSubmit)} className="space-y-4">
                                      <FormField control={form.control} name="customerName" render={({ field }) => (
                                          <FormItem>
                                              <FormLabel className="dark:text-gray-300">Họ và Tên</FormLabel>
                                              <FormControl>
                                                  <Input placeholder="Nguyễn Văn A" {...field} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                              </FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )} />
                                       <FormField control={form.control} name="customerAddress" render={({ field }) => (
                                          <FormItem>
                                              <FormLabel className="dark:text-gray-300">Địa chỉ giao hàng</FormLabel>
                                              <FormControl>
                                                  <Textarea placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố" {...field} className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                              </FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )} />
                                      <DialogFooter>
                                          <DialogClose asChild>
                                              <Button type="button" variant="outline" className="dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">Hủy</Button>
                                          </DialogClose>
                                          <Button type="submit" disabled={isSubmittingOrder} className="text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                                              {isSubmittingOrder && <LoaderCircle className="animate-spin mr-2" />}
                                              Xác nhận Đặt hàng
                                          </Button>
                                      </DialogFooter>
                                  </form>
                              </Form>
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                   </Card>
                </div>

              </div>
              
              <div className="mt-8">
                <Card className="shadow-md border-gray-200/80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm dark:border-gray-700/80">
                  <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                          <Sparkles className="text-cyan-500" /> Tư vấn với Trợ lý AI
                      </CardTitle>
                      <CardDescription>Không chắc chắn về lựa chọn? Hãy hỏi trợ lý AI để có được lời khuyên tối ưu.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Label className="font-medium flex items-center gap-2" htmlFor="user-prompt">
                        <MessageCircleQuestion className="h-5 w-5" />
                        Yêu cầu tư vấn cụ thể (tùy chọn)
                      </Label>
                      <Textarea
                        id="user-prompt"
                        placeholder="Ví dụ: Tôi muốn in mô hình này để làm mô hình trưng bày, chịu được va đập nhẹ..."
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className="bg-white/80 dark:bg-gray-800/80"
                      />
                      <Button onClick={handleConsultation} disabled={isConsulting} className="text-white bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-800">
                          {isConsulting ? (
                              <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> AI đang phân tích...</>
                          ) : (
                              <>Gửi yêu cầu tư vấn</>
                          )}
                      </Button>

                      {isConsulting && !consultationResult && (
                        <div className="flex items-center gap-4 p-4 min-h-[100px] bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                          <LoaderCircle className="h-8 w-8 animate-spin text-cyan-600" />
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">AI đang phân tích...</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Trợ lý ảo đang chuẩn bị lời khuyên cho bạn.</p>
                          </div>
                        </div>
                      )}

                      {consultationError && (
                        <Card className="bg-destructive/10 border-destructive/50 text-destructive-foreground">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle /> Lỗi Tư Vấn</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{consultationError}</p>
                                <Button onClick={handleConsultation} variant="destructive" size="sm" className="mt-3">Thử lại</Button>
                            </CardContent>
                        </Card>
                      )}

                      {consultationResult && !isConsulting && (
                          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg border border-cyan-200 dark:border-cyan-800">
                            <h4 className="font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
                              <Sparkles className="h-5 w-5" /> Lời khuyên từ AI
                            </h4>
                            <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 dark:text-gray-300 mt-2 prose-strong:text-gray-800 dark:prose-strong:text-gray-200">
                              <ReactMarkdown>{consultationResult.advice}</ReactMarkdown>
                            </div>
                            {canApplySuggestion && (
                                <Button onClick={applyAISuggestion} size="sm" className="mt-4 text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                                    <Wand2 className="mr-2 h-4 w-4" /> Áp dụng đề xuất
                                </Button>
                            )}
                          </div>
                      )}
                  </CardContent>
                </Card>
              </div>
            </div>
        )}
      </main>

      <footer className="bg-white/80 dark:bg-gray-950/80 border-t mt-auto border-gray-200/80 dark:border-gray-800/80">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} in3D. All rights reserved.
          </div>
      </footer>
    </div>
  );
}
