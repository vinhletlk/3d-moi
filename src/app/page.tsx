"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { calculateVolume, type CalculateVolumeOutput } from "@/ai/flows/calculate-volume-from-stl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Upload, LoaderCircle, Ruler, Shell, RefreshCw, Scale, Atom, Droplets, Contrast, Percent, Weight } from "lucide-react";

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
        setResults(calculationResult);
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Tính toán thất bại",
          description: error.message || "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
        });
        setFileName("");
      } finally {
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
      // For FDM, volume is reduced by infill percentage
      volume = results.volume * (infillPercentage / 100);
    } else { // Resin
      density = DENSITY_RESIN;
      costPerGram = COST_PER_GRAM_RESIN;
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
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="text-center bg-card p-6">
           <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4 shadow-lg">
            <Scale className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Máy tính chi phí in3D</CardTitle>
          <CardDescription className="text-md pt-1">
            Tải lên tệp .STL để tính toán khối lượng và ước tính chi phí in.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!fileName && !isLoading && (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".stl"
              />
              <Button onClick={handleUploadClick} size="lg">
                <Upload className="mr-2 h-5 w-5" />
                Tải lên tệp STL
              </Button>
              <p className="text-sm text-muted-foreground mt-2">Khuyến nghị STL nhị phân. Tối đa 50MB.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4 p-6 min-h-[200px]">
              <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Đang tính khối lượng cho <span className="font-bold text-primary">{fileName}</span>...</p>
              <p className="text-muted-foreground">Quá trình này có thể mất một chút thời gian.</p>
            </div>
          )}
          
          {results && !isLoading && (
            <div className="pt-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-secondary/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Khối lượng tổng thể</CardTitle>
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {results.volume.toFixed(2)} <span className="text-lg text-muted-foreground">cm³</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Diện tích bề mặt</CardTitle>
                    <Shell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {results.surfaceArea.toFixed(2)} <span className="text-lg text-muted-foreground">cm²</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

               <div className="space-y-3">
                <Label className="text-base">Công nghệ in</Label>
                <RadioGroup
                  value={technology}
                  onValueChange={(value) => setTechnology(value as PrintTechnology)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="fdm" id="fdm" className="peer sr-only" />
                    <Label
                      htmlFor="fdm"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Atom className="mb-3 h-6 w-6" />
                      FDM
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="resin" id="resin" className="peer sr-only" />
                    <Label
                      htmlFor="resin"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Droplets className="mb-3 h-6 w-6" />
                      Resin
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {technology === 'fdm' && (
                <div className="space-y-3">
                  <Label className="text-base flex items-center" htmlFor="infill">
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
                <div className="space-y-3">
                   <Label className="text-base flex items-center" htmlFor="shell">
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

              <Card className="bg-secondary/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cân nặng ước tính</CardTitle>
                    <Weight className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {weight.toFixed(2)} <span className="text-lg text-muted-foreground">g</span>
                    </div>
                  </CardContent>
                </Card>


              <div className="bg-accent/20 border border-accent rounded-lg p-4 text-center">
                <Label className="text-base font-semibold text-accent-foreground/90">Tổng chi phí ước tính</Label>
                <div className="text-4xl font-extrabold" style={{color: 'hsl(var(--accent))'}}>
                  {(totalCost).toLocaleString('vi-VN', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} đ
                </div>
                 <p className="text-sm text-muted-foreground mt-1">
                  (@ {costPerGram.toLocaleString('vi-VN')} đ/g)
                </p>
              </div>
            </div>
          )}
        </CardContent>
        { (fileName || results) && !isLoading && (
          <CardFooter className="p-6 pt-0">
             <Button onClick={handleReset} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tính toán tệp khác
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
