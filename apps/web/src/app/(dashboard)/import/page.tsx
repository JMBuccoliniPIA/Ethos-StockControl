'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Package, Truck, Plus, Download, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  importApi,
  type UploadResult,
  type PreviewResult,
  type ConfirmResult,
} from '@/features/import/api/import.api';
import { useActiveSuppliers } from '@/features/suppliers/api/use-suppliers';
import { SupplierDialog } from '@/features/suppliers/components/supplier-dialog';
import { exportPreviewToExcel } from '@/features/import/lib/export-to-excel';

// Fields available for mapping - standard products
const MAPPABLE_FIELDS_STANDARD = [
  { value: 'sku', label: 'SKU / Código', required: false },
  { value: 'name', label: 'Nombre', required: true },
  { value: 'description', label: 'Descripción', required: false },
  { value: 'family', label: 'Familia', required: false },
  { value: 'subfamily', label: 'Subfamilia', required: false },
  { value: 'stock', label: 'Stock', required: false },
  { value: 'stockMin', label: 'Stock mínimo', required: false },
  { value: 'basePrice', label: 'Precio base', required: false },
  { value: 'discountPercent', label: 'Descuento %', required: false },
  { value: 'status', label: 'Estado', required: false },
];

// Fields available for mapping - supplier products
const MAPPABLE_FIELDS_SUPPLIER = [
  { value: 'supplierSku', label: 'Código proveedor', required: true },
  { value: 'supplierName', label: 'Nombre producto', required: true },
  { value: 'basePrice', label: 'Precio base', required: true },
  { value: 'discountPercent', label: 'Descuento %', required: false },
  { value: 'description', label: 'Descripción', required: false },
  { value: 'category', label: 'Categoría', required: false },
];

type Step = 'upload' | 'sheet-select' | 'mapping' | 'preview' | 'result';

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Sheet selection state
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Supplier import state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const { data: suppliers, isLoading: loadingSuppliers } = useActiveSuppliers();

  // Impact-stock state (supplier flow, step 4)
  const [impactConfirmOpen, setImpactConfirmOpen] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactResult, setImpactResult] = useState<{
    productsCreated: number;
    productsUpdated: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  // Determine which fields to use based on import type
  const isSupplierImport = !!selectedSupplierId;
  const MAPPABLE_FIELDS = isSupplierImport ? MAPPABLE_FIELDS_SUPPLIER : MAPPABLE_FIELDS_STANDARD;
  const requiredFields = MAPPABLE_FIELDS.filter((f) => f.required).map((f) => f.value);
  const hasAllRequiredFields = requiredFields.every((field) => !!mapping[field]);

  // Step 1: Upload — detect sheets first, then parse
  const handleUpload = useCallback(async (selectedFile: File, sheetName?: string) => {
    setFile(selectedFile);
    setLoading(true);
    setError('');
    setUploadProgress(0);
    try {
      const result = selectedSupplierId
        ? await importApi.uploadSupplier(selectedFile, selectedSupplierId, sheetName, setUploadProgress)
        : await importApi.upload(selectedFile, sheetName, setUploadProgress);

      // If multiple sheets and no sheet selected yet, show sheet selector
      if (!sheetName && result.sheetNames && result.sheetNames.length > 1) {
        setSheetNames(result.sheetNames);
        setStep('sheet-select');
        return;
      }

      setUploadResult(result);
      setMapping(result.autoMapping);

      // Parser-based flow: skip column mapping — data is already parsed
      if (result.autoParsed) {
        setPreviewResult({
          jobId: result.jobId,
          totalRows: result.totalRows,
          validRows: result.totalRows,
          errorRows: 0,
          duplicateRows: 0,
          preview: result.sampleRows.map((data, i) => ({
            rowNumber: i + 1,
            data,
            status: 'valid' as const,
          })),
        });
        setStep('preview');
        return;
      }

      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir archivo');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }, [selectedSupplierId]);

  // Re-upload with selected sheet
  const handleSheetSelect = useCallback(async () => {
    if (!file || !selectedSheet) return;
    await handleUpload(file, selectedSheet);
  }, [file, selectedSheet, handleUpload]);

  // Step 2: Preview with mapping
  const handlePreview = useCallback(async () => {
    if (!file || !uploadResult) return;
    setLoading(true);
    setError('');
    try {
      const sheet = selectedSheet || undefined;
      const result = isSupplierImport
        ? await importApi.previewSupplier(uploadResult.jobId, file, mapping, sheet)
        : await importApi.preview(uploadResult.jobId, file, mapping, sheet);
      setPreviewResult(result);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar preview');
    } finally {
      setLoading(false);
    }
  }, [file, uploadResult, mapping, isSupplierImport, selectedSheet]);

  // Step 3: Confirm
  const handleConfirm = useCallback(async () => {
    if (!previewResult) return;
    setLoading(true);
    setError('');
    try {
      const result = isSupplierImport
        ? await importApi.confirmSupplier(previewResult.jobId)
        : await importApi.confirm(previewResult.jobId);
      setConfirmResult(result);
      // Lists derived from this import are now stale
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['unified-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['import-history-supplier'] });
      setStep('result');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al confirmar importación');
    } finally {
      setLoading(false);
    }
  }, [previewResult, isSupplierImport, queryClient]);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setUploadResult(null);
    setMapping({});
    setPreviewResult(null);
    setConfirmResult(null);
    setError('');
    setSelectedSupplierId('');
    setSheetNames([]);
    setSelectedSheet('');
    setUploadProgress(null);
    setImpactResult(null);
    setImpactConfirmOpen(false);
  };

  const handleImpactStock = async () => {
    if (!confirmResult) return;
    setImpactLoading(true);
    setError('');
    try {
      const res = await importApi.impactStockSupplier(confirmResult.jobId);
      setImpactResult({
        productsCreated: res.productsCreated,
        productsUpdated: res.productsUpdated,
        errors: res.errors,
      });
      // Products + Stock catalog changed
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImpactConfirmOpen(false);
    } catch (err: any) {
      // Close the dialog so the error banner (rendered above) isn't hidden by the overlay
      setImpactConfirmOpen(false);
      setError(err.response?.data?.message || 'Error al impactar en stock');
    } finally {
      setImpactLoading(false);
    }
  };

  // Update mapping for a field
  const updateMapping = (field: string, header: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (header === '_none') {
        delete next[field];
      } else {
        next[field] = header;
      }
      return next;
    });
  };

  // Invert mapping: field → header to header → field for display
  const getFieldForHeader = (header: string): string | undefined => {
    return Object.entries(mapping).find(([, h]) => h === header)?.[0];
  };

  // Download the previewed/imported data as Excel
  const handleExportExcel = () => {
    if (!previewResult) return;
    try {
      exportPreviewToExcel(
        previewResult.preview,
        isSupplierImport ? 'supplier' : 'standard',
        file?.name ?? 'planilla-importada',
      );
    } catch (err: any) {
      setError(err?.message || 'No se pudo exportar la planilla a Excel');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Excel</h1>
        <p className="text-muted-foreground">
          Carga masiva desde planillas: productos al catálogo general, o listas de precios de un proveedor. El sistema detecta columnas, previsualiza el resultado y confirma con un solo paso.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'mapping', 'preview', 'result'] as const).map((s, i) => {
          const allSteps: Step[] = ['upload', 'sheet-select', 'mapping', 'preview', 'result'];
          const currentIdx = allSteps.indexOf(step);
          const displayIdx = allSteps.indexOf(s === 'upload' ? 'upload' : s);
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                  step === s || (step === 'sheet-select' && s === 'upload')
                    ? 'bg-primary text-primary-foreground'
                    : currentIdx > displayIdx
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="font-medium">{i + 1}</span>
                <span className="hidden sm:inline">
                  {s === 'upload' && 'Subir archivo'}
                  {s === 'mapping' && 'Mapear columnas'}
                  {s === 'preview' && 'Vista previa'}
                  {s === 'result' && 'Resultado'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Import type selector */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de importación</CardTitle>
              <CardDescription>
                Elegí si querés importar productos estándar o una lista de proveedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierId('')}
                  className={`flex flex-col items-center p-6 rounded-lg border-2 transition-colors ${
                    !selectedSupplierId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Package className="h-8 w-8 mb-2 text-muted-foreground" />
                  <span className="font-medium">Productos estándar</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Importar al inventario general
                  </span>
                </button>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSupplierId('pending')}
                    className={`w-full flex flex-col items-center p-6 rounded-lg border-2 transition-colors ${
                      selectedSupplierId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Truck className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span className="font-medium">Lista de proveedor</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Importar precios de un proveedor
                    </span>
                  </button>
                  {selectedSupplierId && (
                    <div className="flex gap-2">
                      <Select
                        value={selectedSupplierId === 'pending' ? '' : selectedSupplierId}
                        onValueChange={setSelectedSupplierId}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar proveedor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingSuppliers ? (
                            <SelectItem value="_loading" disabled>Cargando...</SelectItem>
                          ) : suppliers?.length === 0 ? (
                            <SelectItem value="_empty" disabled>No hay proveedores activos</SelectItem>
                          ) : (
                            suppliers?.map((s) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setSupplierDialogOpen(true)}
                        title="Crear nuevo proveedor"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File upload */}
          <Card>
            <CardHeader>
              <CardTitle>Subir archivo Excel</CardTitle>
              <CardDescription>
                {selectedSupplierId
                  ? 'Seleccioná el archivo con la lista de precios del proveedor'
                  : 'Seleccioná un archivo .xlsx con tus productos'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 transition-colors ${
                  selectedSupplierId && selectedSupplierId === 'pending'
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                {loading ? (
                  <div className="w-full max-w-md flex flex-col items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium">
                      {uploadProgress !== null && uploadProgress < 100
                        ? `Subiendo archivo... ${uploadProgress}%`
                        : 'Procesando archivo...'}
                    </p>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      {uploadProgress !== null && uploadProgress < 100 ? (
                        <div
                          className="h-full bg-primary transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      ) : (
                        <div className="h-full bg-primary/70 animate-pulse w-full" />
                      )}
                    </div>
                    {file && (
                      <p className="text-xs text-muted-foreground truncate max-w-full">
                        {file.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">
                      Click para seleccionar archivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solo archivos .xlsx — máximo 10MB
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                  disabled={loading || (selectedSupplierId === 'pending')}
                />
              </label>
              {selectedSupplierId === 'pending' && (
                <p className="text-sm text-amber-600 mt-2">
                  Seleccioná un proveedor antes de subir el archivo
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sheet selection (when multiple sheets) */}
      {step === 'sheet-select' && sheetNames.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar hoja</CardTitle>
            <CardDescription>
              El archivo tiene {sheetNames.length} hojas. Elegí cuál querés importar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sheetNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedSheet(name)}
                  className={`flex items-center gap-2 p-4 rounded-lg border-2 transition-colors text-left ${
                    selectedSheet === name
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button
                onClick={handleSheetSelect}
                disabled={!selectedSheet || loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continuar con &quot;{selectedSheet || '...'}&quot;
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column mapping */}
      {step === 'mapping' && uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeo de columnas</CardTitle>
            <CardDescription>
              Se detectaron {uploadResult.headers.length} columnas y {uploadResult.totalRows} filas.
              Verificá que el mapeo automático sea correcto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSupplierImport && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Importación de proveedor:</strong> Los productos se guardarán como productos del proveedor seleccionado.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {MAPPABLE_FIELDS.map((field) => (
                <div key={field.value} className="space-y-1">
                  <Label className="text-xs">
                    {field.label}
                    {field.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <Select
                    value={mapping[field.value] ?? '_none'}
                    onValueChange={(val) => updateMapping(field.value, val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="No mapeado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— No mapeado —</SelectItem>
                      {uploadResult.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                          {getFieldForHeader(h) && getFieldForHeader(h) !== field.value && (
                            <span className="text-muted-foreground ml-1">
                              (→ {MAPPABLE_FIELDS.find((f) => f.value === getFieldForHeader(h))?.label})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Sample data */}
            {uploadResult.sampleRows.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Muestra de datos (primeras {uploadResult.sampleRows.length} filas):
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-muted">
                        {uploadResult.headers.map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.sampleRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {uploadResult.headers.map((h) => (
                            <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button
                onClick={handlePreview}
                disabled={loading || !hasAllRequiredFields}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Validar y previsualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && previewResult && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa de importación</CardTitle>
            <CardDescription>Revisá los datos antes de confirmar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResult?.autoParsed && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                <strong>Parser automático:</strong> se extrajeron {previewResult.totalRows} productos. Mostrando una muestra de los primeros {previewResult.preview.length}.
                {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                  <p className="mt-2 text-xs">
                    {uploadResult.warnings.length} advertencia(s) durante el parseo.
                  </p>
                )}
              </div>
            )}
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{previewResult.totalRows}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Válidas</p>
                <p className="text-xl font-bold text-emerald-600">{previewResult.validRows}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Con errores</p>
                <p className="text-xl font-bold text-destructive">{previewResult.errorRows}</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-xs text-muted-foreground">Duplicadas</p>
                <p className="text-xl font-bold text-amber-600">{previewResult.duplicateRows}</p>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-md border max-h-[400px] overflow-y-auto">
              <table className="text-sm w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    {isSupplierImport ? (
                      <>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Precio</th>
                        <th className="px-3 py-2 text-left">Dto %</th>
                        <th className="px-3 py-2 text-left">Costo Neto</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left">SKU</th>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Familia</th>
                        <th className="px-3 py-2 text-left">Stock</th>
                        <th className="px-3 py-2 text-left">Precio</th>
                      </>
                    )}
                    <th className="px-3 py-2 text-left">Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.preview.map((row) => {
                    const basePrice = Number(row.data.basePrice ?? 0);
                    const discount = Number(row.data.discountPercent ?? 0);
                    const netCost = basePrice * (1 - discount / 100);
                    return (
                      <tr
                        key={row.rowNumber}
                        className={`border-t ${
                          row.status === 'error'
                            ? 'bg-destructive/5'
                            : row.status === 'duplicate'
                              ? 'bg-amber-50'
                              : ''
                        }`}
                      >
                        <td className="px-3 py-1.5 text-muted-foreground">{row.rowNumber}</td>
                        <td className="px-3 py-1.5">
                          <Badge
                            variant={
                              row.status === 'valid'
                                ? 'success'
                                : row.status === 'duplicate'
                                  ? 'warning'
                                  : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            {row.status === 'valid' ? 'OK' : row.status === 'duplicate' ? 'Dup' : 'Error'}
                          </Badge>
                        </td>
                        {isSupplierImport ? (
                          <>
                            <td className="px-3 py-1.5 font-mono text-xs">{String(row.data.supplierSku ?? '-')}</td>
                            <td className="px-3 py-1.5">{String(row.data.supplierName ?? '-')}</td>
                            <td className="px-3 py-1.5">${basePrice.toFixed(2)}</td>
                            <td className="px-3 py-1.5">{discount > 0 ? `${discount}%` : '-'}</td>
                            <td className="px-3 py-1.5 font-medium">${netCost.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-1.5 font-mono text-xs">{String(row.data.sku ?? '-')}</td>
                            <td className="px-3 py-1.5">{String(row.data.name ?? '-')}</td>
                            <td className="px-3 py-1.5">{String(row.data.family ?? '-')}</td>
                            <td className="px-3 py-1.5">{String(row.data.stock ?? 0)}</td>
                            <td className="px-3 py-1.5">${String(row.data.basePrice ?? 0)}</td>
                          </>
                        )}
                        <td className="px-3 py-1.5 text-xs text-destructive max-w-[200px] truncate">
                          {row.errors?.join(', ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {previewResult.validRows === 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                No hay filas válidas para importar. Corregí los errores e intentá de nuevo.
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {!uploadResult?.autoParsed && (
                <Button variant="outline" onClick={() => setStep('mapping')}>Volver al mapeo</Button>
              )}
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={previewResult.preview.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar a Excel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || previewResult.validRows === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar importación ({previewResult.validRows} productos)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(s) => setSelectedSupplierId(s._id)}
      />

      {/* Step 4: Result */}
      {step === 'result' && confirmResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Importación completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSupplierImport ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Nuevos en la lista del proveedor</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {confirmResult.supplierProductsCreated ?? confirmResult.productsCreated}
                    </p>
                  </div>
                  <div className="rounded-md border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Precios actualizados</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {confirmResult.supplierProductsUpdated ?? 0}
                    </p>
                  </div>
                </div>
                {!impactResult && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                    Los cambios se aplicaron a la lista del proveedor. Para reflejar los nuevos
                    precios en <strong>Productos + Stock</strong>, apretá <em>Impactar en Stock</em>.
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-md border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Productos creados</p>
                  <p className="text-2xl font-bold text-emerald-600">{confirmResult.productsCreated}</p>
                </div>
                <div className="rounded-md border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Familias creadas</p>
                  <p className="text-2xl font-bold">{confirmResult.familiesCreated}</p>
                </div>
                <div className="rounded-md border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Subfamilias creadas</p>
                  <p className="text-2xl font-bold">{confirmResult.subfamiliesCreated}</p>
                </div>
              </div>
            )}

            {confirmResult.errors.length > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {confirmResult.errors.length} fila(s) no se pudieron importar:
                </p>
                <div className="space-y-1">
                  {confirmResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      Fila {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {isSupplierImport && impactResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4" />
                  Impacto en Productos + Stock completado
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border bg-white p-3 text-center">
                    <p className="text-xs text-muted-foreground">Productos creados</p>
                    <p className="text-xl font-bold text-emerald-600">{impactResult.productsCreated}</p>
                  </div>
                  <div className="rounded-md border bg-white p-3 text-center">
                    <p className="text-xs text-muted-foreground">Productos actualizados</p>
                    <p className="text-xl font-bold text-blue-600">{impactResult.productsUpdated}</p>
                  </div>
                </div>
                {impactResult.errors.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-xs font-medium text-amber-800">
                      {impactResult.errors.length} fila(s) con error:
                    </p>
                    {impactResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-700">
                        Fila {e.row}: {e.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button onClick={reset}>
                <Upload className="h-4 w-4 mr-2" />
                Importar otro archivo
              </Button>
              {previewResult && (
                <Button variant="outline" onClick={handleExportExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar planilla a Excel
                </Button>
              )}
              {isSupplierImport && !impactResult && (
                <Button
                  variant="default"
                  onClick={() => setImpactConfirmOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Impactar en Stock
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={impactConfirmOpen} onOpenChange={setImpactConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              Impactar en Stock
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Se tomará la lista del proveedor recién importada y se aplicará al catálogo de Productos + Stock usando el mismo SKU del proveedor:
              </span>
              <span className="block">
                • Los productos cuyo SKU ya existe en Productos serán <strong>actualizados</strong> en precio y descuento (el stock no se modifica).
              </span>
              <span className="block">
                • Los productos cuyo SKU no existe serán <strong>creados</strong> en Productos con stock 0 bajo la familia &quot;Sin clasificar&quot;.
              </span>
              <span className="block pt-2 text-amber-700">
                Esta acción no afecta a la lista del proveedor, solo al catálogo general.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImpactConfirmOpen(false)}
              disabled={impactLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImpactStock}
              disabled={impactLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {impactLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar e impactar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
