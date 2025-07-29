"use client";

import { useState, useRef, type ChangeEvent, useEffect, Suspense } from "react";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Upload, LoaderCircle, Ruler, Shell, RefreshCw, Scale, Atom, Droplets, Contrast, Percent, Weight, Box, Sparkles, AlertTriangle, Wand2, Send, ListOrdered, Eye } from "lucide-react";
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
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";


type PrintTechnology = "fdm" | "resin";

interface CalculationOutput {
  volume: number;
  surfaceArea: number;
}

const DENSITY_FDM = 1.25; 
const DENSITY_RESIN = 1.15;

const COST_PER_GRAM_FDM = 1000;
const COST_PER_GRAM_RESIN = 4000;
const SUPPORT_COST_FACTOR = 1.15; // 15% increase for supports

const StlViewer = dynamic(() => import('@/components/stl-viewer'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center"><Skeleton className="w-full h-full" /></div>
});


export default function Home() {
  const [results, setResults] = useState<CalculationOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [technology, setTechnology] = useState<PrintTechnology>("fdm");
  const [infillPercentage, setInfillPercentage] = useState<number>(20);
  const [shellThickness, setShellThickness] = useState<number>(2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);

  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [consultationResult, setConsultationResult] = useState<ConsultationOutput | null>(null);
  const [consultationError, setConsultationError] = useState<string | null>(null);

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const form = useForm<OrderInput>({
    resolver: zodResolver(OrderInputSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
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
    setFileUrl(URL.createObjectURL(file));
    setIsLoading(true);
    setResults(null);
    setConsultationResult(null);
    setConsultationError(null);

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async () => {
      try {
        const buffer = Buffer.from(reader.result as ArrayBuffer);
        const parser = new StlParser();
        const calculationResult = parser.parse(buffer);

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
        setFileUrl(null);
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
        setFileUrl(null);
    };
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setResults(null);
    setIsLoading(false);
    setFileName("");
    if(fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
    setProgress(0);
    setConsultationResult(null);
    setConsultationError(null);
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const calculateCost = () => {
    if (!results) return { weight: 0, totalCost: 0, costPerGram: 0 };
    
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
    let totalCost = weight * costPerGram;

    // Always add support cost
    weight *= SUPPORT_COST_FACTOR;
    totalCost *= SUPPORT_COST_FACTOR;

    return { weight, totalCost, costPerGram };
  };

  const { weight, totalCost, costPerGram } = calculateCost();

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
      await processOrder({ ...values, orderDetails });
      setIsOrderDialogOpen(false);
      form.reset();
      toast({
        title: "Đặt hàng thành công!",
        description: "Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ với bạn sớm nhất.",
      });
    } catch (error) {
       console.error("Order submission error:", error);
       toast({
         variant: "destructive",
         title: "Lỗi đặt hàng",
         description: "Đã có lỗi xảy ra. Vui lòng thử lại sau."
       });
    } finally {
        setIsSubmittingOrder(false);
    }
  };


  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-2">
                    <Scale className="w-8 h-8 text-primary" />
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">in3D</h1>
                </div>
                 <div className="flex items-center space-x-2">
                    <Button variant="ghost" asChild>
                        <Link href="/orders">
                            <ListOrdered className="mr-2 h-4 w-4"/>
                            Quản lý Đơn hàng
                        </Link>
                    </Button>
                    <Button variant="ghost">Đăng nhập</Button>
                </div>
            </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <Card className="w-full shadow-lg rounded-xl overflow-hidden border-border bg-card/50">
            <CardHeader className="text-center p-6 sm:p-8">
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Ước tính chi phí in 3D
              </CardTitle>
              <CardDescription className="text-md sm:text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                Tải lên tệp .STL để nhận ngay báo giá tức thì cho cả in FDM và Resin. Chi phí đã bao gồm support.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {!fileName && !isLoading && (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-border rounded-lg text-center transition-colors hover:border-primary hover:bg-accent">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".stl"
                  />
                  <div className="mb-4 text-primary">
                    <Upload className="h-10 w-10 sm:h-12 sm:w-12" />
                  </div>
                  <Button onClick={handleUploadClick} size="lg" className="font-bold text-base">
                    Chọn tệp STL
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">hoặc kéo và thả tệp vào đây</p>
                  <p className="text-xs text-muted-foreground mt-4">Hỗ trợ STL nhị phân & ASCII. Tối đa 50MB.</p>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center space-y-4 p-6 min-h-[200px]">
                  <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-lg sm:text-xl font-semibold">Đang xử lý <span className="font-bold text-primary">{fileName}</span></p>
                  <Progress value={progress} className="w-full max-w-sm" />
                  <p className="text-sm text-muted-foreground">Quá trình này có thể mất một chút thời gian...</p>
                </div>
              )}
              
              {results && !isLoading && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
                   <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                         <Card className="p-4 bg-secondary/30 rounded-lg border border-border flex items-center gap-4">
                             <Box className="w-10 h-10 text-primary/50 flex-shrink-0" />
                             <div className="flex-grow overflow-hidden">
                                 <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
                                 <p className="text-xs text-muted-foreground">Tệp đã tải lên</p>
                             </div>
                         </Card>
                         
                         <div className="flex items-center gap-2 md:justify-self-end">
                            {fileUrl && (
                               <Dialog>
                                   <DialogTrigger asChild>
                                       <Button variant="outline">
                                           <Eye className="mr-2 h-5 w-5" />
                                           Xem trước
                                       </Button>
                                   </DialogTrigger>
                                   <DialogContent className="max-w-3xl h-3/4 flex flex-col">
                                       <DialogHeader>
                                           <DialogTitle>Xem trước: {fileName}</DialogTitle>
                                       </DialogHeader>
                                       <div className="flex-grow bg-muted rounded-lg border">
                                           <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Skeleton className="w-full h-full" /></div>}>
                                                <StlViewer fileUrl={fileUrl} />
                                           </Suspense>
                                       </div>
                                       <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button">Đóng</Button>
                                            </DialogClose>
                                       </DialogFooter>
                                   </DialogContent>
                               </Dialog>
                            )}
                            {!consultationResult && !isConsulting && !consultationError && (
                              <Button onClick={handleConsultation}>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Tư vấn
                              </Button>
                            )}
                         </div>
                     </div>
                   </div>
                  <div className="space-y-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-foreground border-b pb-2">Thông số mô hình</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-secondary/80">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Thể tích</CardTitle>
                            <Ruler className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl sm:text-2xl font-bold">
                              {results.volume.toFixed(2)} <span className="text-sm sm:text-base font-normal text-muted-foreground">cm³</span>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-secondary/80">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Bề mặt</CardTitle>
                            <Shell className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl sm:text-2xl font-bold">
                              {results.surfaceArea.toFixed(2)} <span className="text-sm sm:text-base font-normal text-muted-foreground">cm²</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Tùy chọn in</h3>
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
                              <Label
                                htmlFor="fdm"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <Atom className="mb-2 h-6 w-6" />
                                FDM
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem value="resin" id="resin" className="peer sr-only" />
                              <Label
                                htmlFor="resin"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <Droplets className="mb-2 h-6 w-6" />
                                Resin
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                        {technology === 'fdm' && (
                          <div className="space-y-3 pt-2">
                            <Label className="text-base font-medium flex items-center" htmlFor="infill">
                              <Percent className="mr-2 h-4 w-4" />
                              Độ rỗng (Infill)
                            </Label>
                            <div className="flex items-center space-x-4">
                              <Slider
                                id="infill"
                                value={[infillPercentage]}
                                onValueChange={(value) => {
                                    setInfillPercentage(value[0]);
                                    setConsultationResult(null);
                                    setConsultationError(null);
                                }}
                                max={100}
                                step={5}
                                className="flex-1"
                              />
                              <span className="text-lg font-bold w-16 text-right text-primary">{infillPercentage}%</span>
                            </div>
                          </div>
                        )}
                        {technology === 'resin' && (
                          <div className="space-y-3 pt-2">
                             <Label className="text-base font-medium flex items-center" htmlFor="shell">
                               <Contrast className="mr-2 h-4 w-4" />
                               Độ dày vỏ (Shell)
                            </Label>
                            <div className="flex items-center space-x-4">
                              <Slider
                                id="shell"
                                value={[shellThickness]}
                                onValueChange={(value) => {
                                    setShellThickness(value[0]);
                                    setConsultationResult(null);
                                    setConsultationError(null);
                                }}
                                max={10}
                                step={0.1}
                                className="flex-1"
                              />
                              <span className="text-lg font-bold w-16 text-right text-primary">{shellThickness.toFixed(1)} mm</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-lg font-semibold text-foreground border-b pb-2">Báo giá ước tính</h3>
                       <Card className="bg-secondary/80">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cân nặng ước tính</CardTitle>
                            <Weight className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl sm:text-2xl font-bold">
                              {weight.toFixed(2)} <span className="text-sm sm:text-base font-normal text-muted-foreground">g</span>
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">(Đã bao gồm support)</p>
                          </CardContent>
                        </Card>
                       <div className="bg-gradient-to-br from-primary/80 to-primary rounded-lg p-6 text-center text-primary-foreground shadow-xl">
                        <Label className="text-md sm:text-lg font-semibold opacity-90">Tổng chi phí</Label>
                        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">
                          {totalCost.toLocaleString('vi-VN', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} đ
                        </div>
                         <p className="text-sm opacity-80 mt-2">
                          (@ {costPerGram.toLocaleString('vi-VN')} đ/g)
                        </p>
                        <p className="text-xs opacity-80 pt-2">(Đã bao gồm 15% chi phí support)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isConsulting && (
                <div className="flex flex-col items-center justify-center space-y-4 p-6 min-h-[150px] bg-secondary/30 rounded-lg">
                  <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-lg font-semibold">AI đang phân tích...</p>
                  <p className="text-sm text-muted-foreground text-center">Trợ lý ảo đang chuẩn bị lời khuyên tối ưu cho bạn.</p>
                </div>
              )}

              {consultationError && (
                <Card className="bg-destructive/10 border-destructive/50 text-destructive-foreground">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle />
                            Lỗi Tư Vấn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{consultationError}</p>
                        <Button onClick={handleConsultation} variant="destructive" className="mt-4">
                            Thử lại
                        </Button>
                    </CardContent>
                </Card>
              )}

              {consultationResult && !isConsulting && (
                 <Card className="bg-secondary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl font-bold text-primary">
                          <Sparkles className="mr-2 h-6 w-6" />
                          Tư vấn từ Trợ lý AI
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-foreground">
                          <ReactMarkdown>{consultationResult.advice}</ReactMarkdown>
                        </div>
                        {canApplySuggestion && (
                           <Button onClick={applyAISuggestion}>
                                <Wand2 className="mr-2 h-4 w-4" />
                                Áp dụng đề xuất của AI
                           </Button>
                        )}
                    </CardContent>
                 </Card>
              )}


            </CardContent>
            { (fileName || results) && !isLoading && (
              <CardFooter className="p-4 sm:p-6 bg-transparent border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <Button onClick={handleReset} variant="outline" className="w-full font-semibold">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tính toán lại
                </Button>
                 <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full font-semibold" size="lg">
                            <Send className="mr-2 h-4 w-4" />
                            Tiến hành Đặt hàng
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Thông tin đặt hàng</DialogTitle>
                            <DialogDescription>
                                Vui lòng điền đầy đủ thông tin để chúng tôi có thể giao hàng cho bạn.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleOrderSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="customerName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Họ và Tên</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nguyễn Văn A" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="customerPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số điện thoại</FormLabel>
                                            <FormControl>
                                                <Input placeholder="09xxxxxxxx" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="customerEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="example@email.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="customerAddress"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Địa chỉ giao hàng</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            Hủy
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={isSubmittingOrder}>
                                        {isSubmittingOrder && <LoaderCircle className="animate-spin mr-2" />}
                                        Xác nhận Đặt hàng
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
      <footer className="bg-card border-t mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} in3D. All rights reserved.
          </div>
      </footer>
    </div>
  );
}
