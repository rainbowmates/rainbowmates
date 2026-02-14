import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const DESKTOP_BREAKPOINT = 768; // pixels - anything wider is considered desktop

const DesktopWarningModal = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkIfDesktop = () => {
      // Check screen width - anything 768px or wider is considered desktop
      const isWideScreen = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(isWideScreen);
    };

    // Check on mount
    checkIfDesktop();

    // Check on resize
    window.addEventListener('resize', checkIfDesktop);

    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  useEffect(() => {
    // Show modal only if desktop and user hasn't dismissed it in this session
    const hasBeenDismissed = sessionStorage.getItem('desktop-warning-dismissed');
    
    if (isDesktop && !hasBeenDismissed) {
      // Small delay to ensure smooth page load
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isDesktop]);

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem('desktop-warning-dismissed', 'true');
  };

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent 
        data-testid="desktop-warning-modal"
        className="sm:max-w-md bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white"
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <DialogTitle 
            data-testid="desktop-warning-title"
            className="text-xl font-bold text-white"
          >
            Best Viewed on Mobile
          </DialogTitle>
          <DialogDescription 
            data-testid="desktop-warning-description"
            className="text-slate-300 mt-2"
          >
            This app is optimized for mobile devices. For the best experience, please open this page on your smartphone or tablet.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <p className="text-sm text-slate-400 text-center mb-4">
              Scan this QR code with your phone to open on mobile
            </p>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG 
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  size={140}
                  level="M"
                  data-testid="desktop-warning-qr-code"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-3 font-mono break-all">
              {typeof window !== 'undefined' ? window.location.href : ''}
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center mt-4">
          <Button
            data-testid="desktop-warning-continue-btn"
            onClick={handleDismiss}
            variant="outline"
            className="w-full sm:w-auto bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Continue on Desktop Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DesktopWarningModal;
