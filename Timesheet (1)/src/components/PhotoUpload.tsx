import { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Maximize2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface PhotoUploadProps {
  label: string;
  photoUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
  error?: string | null;
}

export function PhotoUpload({ label, photoUrl, onUpload, onRemove, uploading, error }: PhotoUploadProps) {
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {!photoUrl ? (
        <div className="space-y-2">
          {/* Upload Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Take Photo'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Empty state */}
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No photo uploaded</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Photo Preview */}
          <div className="relative group">
            <img 
              src={photoUrl} 
              alt={label}
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            
            {/* Overlay buttons on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowPreview(true)}
                className="shadow-lg"
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                View
              </Button>
              
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={onRemove}
                className="shadow-lg"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>

          {/* Action Buttons (Mobile) */}
          <div className="flex gap-2 sm:hidden">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="flex-1"
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              View
            </Button>
            
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="flex-1"
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* Full Screen Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <img 
              src={photoUrl || ''} 
              alt={label}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}