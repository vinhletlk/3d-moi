"use client";

import { useState, useRef, type ChangeEvent, useEffect } from "react";
import { calculateVolume, type CalculateVolumeOutput } from "@/ai/flows/calculate-volume-from-stl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Upload, LoaderCircle, Ruler, Shell, RefreshCw, Scale, Atom, Droplets, Contrast, Percent, Weight, Box } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { app } from "@/lib/firebase"; // Import a initialized firebase app

type PrintTechnology = "fdm" | "resin";

// Approximate densities (g/cm³)
const DENSITY_FDM = 1.25; // e.g., PLA plastic
const DENSITY_RESIN = 1.15; // e.g., standard resin

const COST_PER_GRAM_FDM = 1000;
const COST_PER_GRAM_RESIN = 4000;

export default function Home() {
  const [results, setResults] = useState<CalculateVolumeOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [technology, setTechnology] = useState<PrintTechnology>("fdm");
  const [infillPercentage, setInfillPercentage] = useState<number>(20);
  const [shellThickness, setShellThickness] = useState<number>(2); // Default 2mm
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [stlDataUri, setStlDataUri] = useState<string>("");
  const [progress, setProgress] = useState(0);

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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const dataUri = reader.result as string;
        setStlDataUri(dataUri);
        const calculationResult = await calculateVolume({ stlDataUri: dataUri });
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
    setIsLoading(false);
    setFileName("");
    setStlDataUri("");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const calculateCost = () => {
    if (!results) return { weight: 0, totalCost: 0, costPerGram: 0 };
    
    let volume = 0;
    let density = 0;
    const costPerGram = technology === 'fdm' ? COST_PER_GRAM_FDM : COST_PER_GRAM_RESIN;

    if (technology === 'fdm') {
      density = DENSITY_FDM;
      // For FDM, volume is reduced by infill percentage
      volume = results.volume * (infillPercentage / 100);
    } else { // Resin
      density = DENSITY_RESIN;
      // For Resin, calculate volume of the shell
      // Approximation: surface area (cm^2) * thickness (cm)
      const thicknessInCm = shellThickness / 10;
      const shellVolume = results.surfaceArea * thicknessInCm;
      // Ensure shell volume is not greater than the total volume
      volume = Math.min(shellVolume, results.volume);
    }

    const weight = volume * density;
    const totalCost = weight * costPerGram;

    return { weight, totalCost, costPerGram };
  };

  const { weight, totalCost, costPerGram } = calculateCost();

  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-2">
                    <Scale className="w-8 h-8 text-primary" />
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">in3D</h1>
                </div>
                <Button variant="ghost">Đăng nhập</Button>
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
                Tải lên tệp .STL của bạn để nhận ngay báo giá tức thì cho cả in FDM và Resin.
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
                     <Card className="aspect-square w-full bg-secondary/30 rounded-lg border border-border flex flex-col items-center justify-center p-4">
                        <Box className="w-20 h-20 sm:w-24 sm:h-24 text-primary/50" />
                        <p className="text-md sm:text-lg font-semibold mt-4 text-foreground text-center">{fileName}</p>
                        <p className="text-sm text-muted-foreground">Tệp đã tải lên</p>
                     </Card>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-foreground border-b pb-2">Thông số mô hình</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-secondary/80">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Khối lượng</CardTitle>
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
                            onValueChange={(value) => setTechnology(value as PrintTechnology)}
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
                                onValueChange={(value) => setInfillPercentage(value[0])}
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
                                onValueChange={(value) => setShellThickness(value[0])}
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
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            { (fileName || results) && !isLoading && (
              <CardFooter className="p-4 sm:p-6 bg-transparent border-t">
                 <Button onClick={handleReset} variant="outline" className="w-full font-semibold">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tính toán lại
                </Button>
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
