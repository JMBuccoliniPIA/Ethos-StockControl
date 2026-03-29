'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

// Fields available for mapping
const MAPPABLE_FIELDS = [
  { value: 'sku', label: 'SKU / Código' },
  { value: 'name', label: 'Nombre' },
  { value: 'description', label: 'Descripción' },
  { value: 'family', label: 'Familia' },
  { value: 'subfamily', label: 'Subfamilia' },
  { value: 'stock', label: 'Stock' },
  { value: 'stockMin', label: 'Stock mínimo' },
  { value: 'basePrice', label: 'Precio base' },
  { value: 'discountPercent', label: 'Descuento %' },
  { value: 'status', label: 'Estado' },
];

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Upload
  const handleUpload = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setError('');
    try {
      const result = await importApi.upload(selectedFile);
      setUploadResult(result);
      setMapping(result.autoMapping);
      setStep('mapping');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir archivo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Step 2: Preview with mapping
  const handlePreview = useCallback(async () => {
    if (!file || !uploadResult) return;
    setLoading(true);
    setError('');
    try {
      const result = await importApi.preview(uploadResult.jobId, file, mapping);
      setPreviewResult(result);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar preview');
    } finally {
      setLoading(false);
    }
  }, [file, uploadResult, mapping]);

  // Step 3: Confirm
  const handleConfirm = useCallback(async () => {
    if (!previewResult) return;
    setLoading(true);
    setError('');
    try {
      const result = await importApi.confirm(previewResult.jobId);
      setConfirmResult(result);
      setStep('result');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al confirmar importación');
    } finally {
      setLoading(false);
    }
  }, [previewResult]);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setUploadResult(null);
    setMapping({});
    setPreviewResult(null);
    setConfirmResult(null);
    setError('');
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
        {['upload', 'mapping', 'preview', 'result'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['upload', 'mapping', 'preview', 'result'].indexOf(step) > i
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
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Subir archivo Excel</CardTitle>
            <CardDescription>Seleccioná un archivo .xlsx con tus productos</CardDescription>
          </CardHeader>
          <CardContent>
            <label
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
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
                disabled={loading}
              />
            </label>
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
            <div className="grid grid-cols-2 gap-4">
              {MAPPABLE_FIELDS.map((field) => (
                <div key={field.value} className="space-y-1">
                  <Label className="text-xs">
                    {field.label}
                    {field.value === 'name' && (
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
              <Button onClick={handlePreview} disabled={loading || !mapping.name}>
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
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Familia</th>
                    <th className="px-3 py-2 text-left">Stock</th>
                    <th className="px-3 py-2 text-left">Precio</th>
                    <th className="px-3 py-2 text-left">Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.preview.map((row) => (
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
                      <td className="px-3 py-1.5 font-mono text-xs">{String(row.data.sku ?? '-')}</td>
                      <td className="px-3 py-1.5">{String(row.data.name ?? '-')}</td>
                      <td className="px-3 py-1.5">{String(row.data.family ?? '-')}</td>
                      <td className="px-3 py-1.5">{String(row.data.stock ?? 0)}</td>
                      <td className="px-3 py-1.5">${String(row.data.basePrice ?? 0)}</td>
                      <td className="px-3 py-1.5 text-xs text-destructive max-w-[200px] truncate">
                        {row.errors?.join(', ')}
                      </td>
                    </tr>
                  ))}
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
