'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sheet selection state
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Supplier import state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const { data: suppliers, isLoading: loadingSuppliers } = useActiveSuppliers();

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
    try {
      const result = selectedSupplierId
        ? await importApi.uploadSupplier(selectedFile, selectedSupplierId, sheetName)
        : await importApi.upload(selectedFile, sheetName);

      // If multiple sheets and no sheet selected yet, show sheet selector
      if (!sheetName && result.sheetNames && result.sheetNames.length > 1) {
        setSheetNames(result.sheetNames);
        setStep('sheet-select');
        return;
      }

      setUploadResult(result);
      setMapping(result.autoMapping);
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir archivo');
    } finally {
      setLoading(false);
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
      setStep('result');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al confirmar importación');
    } finally {
      setLoading(false);
    }
  }, [previewResult, isSupplierImport]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar Excel</h1>
        <p className="text-muted-foreground">Carga masiva de productos desde archivo Excel</p>
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
                    onClick={() => setSelectedSupplierId(suppliers?.[0]?._id || 'pending')}
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
                    <Select
                      value={selectedSupplierId === 'pending' ? '' : selectedSupplierId}
                      onValueChange={setSelectedSupplierId}
                    >
                      <SelectTrigger>
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
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
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
                <p className="text-sm font-medium mb-2">Muestra de datos (primeras 5 filas):</p>
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('mapping')}>Volver al mapeo</Button>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Productos creados</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {(confirmResult as any).supplierProductsCreated ?? confirmResult.productsCreated}
                  </p>
                </div>
                <div className="rounded-md border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Productos actualizados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(confirmResult as any).supplierProductsUpdated ?? 0}
                  </p>
                </div>
              </div>
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

            <Button onClick={reset}>
              <Upload className="h-4 w-4 mr-2" />
              Importar otro archivo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
