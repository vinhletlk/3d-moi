"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { calculateVolume, type CalculateVolumeOutput } from "@/ai/flows/calculate-volume-from-stl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, LoaderCircle, Ruler, Shell, DollarSign, RefreshCw, Scale } from "lucide-react";

export default function Home() {
  const [results, setResults] = useState<CalculateVolumeOutput | null>(null);
  const [costPerCm3, setCostPerCm3] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    setCostPerCm3("");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const stlDataUri = reader.result as string;
        const calculationResult = await calculateVolume({ stlDataUri });
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
    setCostPerCm3("");
    setIsLoading(false);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const parsedCost = parseFloat(costPerCm3);
  const totalCost = results?.volume && !isNaN(parsedCost) ? results.volume * parsedCost : 0;

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
            <div className="space-y-6 animate-in fade-in-50 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-secondary/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Khối lượng</CardTitle>
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

              <div className="space-y-2">
                <Label htmlFor="cost" className="text-base">Chi phí mỗi cm³</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="cost"
                    type="number"
                    value={costPerCm3}
                    onChange={(e) => setCostPerCm3(e.target.value)}
                    placeholder="ví dụ: 0.25"
                    className="pl-10 text-base"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="bg-accent/20 border border-accent rounded-lg p-4 text-center">
                <Label className="text-base font-semibold text-accent-foreground/90">Tổng chi phí ước tính</Label>
                <div className="text-4xl font-extrabold text-accent-foreground" style={{color: 'hsl(var(--accent))'}}>
                  $ {totalCost.toFixed(2)}
                </div>
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
