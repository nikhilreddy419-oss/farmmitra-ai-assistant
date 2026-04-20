import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const LABELS: Record<string, { download: string; preparing: string; failed: string }> = {
  en: { download: "Download PDF", preparing: "Preparing…", failed: "Could not generate PDF" },
  hi: { download: "PDF डाउनलोड करें", preparing: "तैयार हो रहा है…", failed: "PDF नहीं बना सका" },
  te: { download: "PDF డౌన్‌లోడ్ చేయండి", preparing: "సిద్ధం చేస్తోంది…", failed: "PDF తయారు చేయలేకపోయాం" },
};

type Props = {
  /** Element id of the rendered recommendation block */
  targetId: string;
  /** Filename without extension */
  fileBaseName?: string;
};

const PdfDownloadButton = ({ targetId, fileBaseName = "FarmMitra-Plan" }: Props) => {
  const { lang } = useLanguage();
  const labels = LABELS[lang] ?? LABELS.en;
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    const node = document.getElementById(targetId);
    if (!node) {
      toast.error(labels.failed);
      return;
    }
    setBusy(true);
    try {
      // Render at higher scale for crisp text; html2canvas captures the actual rendered fonts
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 24;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = margin;

      pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
      heightLeft -= pageH - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgH - heightLeft);
        pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
        heightLeft -= pageH - margin * 2;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`${fileBaseName}-${stamp}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error(labels.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleDownload}
      disabled={busy}
      className="gap-2"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? labels.preparing : labels.download}
    </Button>
  );
};

export default PdfDownloadButton;
