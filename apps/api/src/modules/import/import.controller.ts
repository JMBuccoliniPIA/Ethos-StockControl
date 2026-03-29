import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('import')
@UseGuards(RolesGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Step 1: Upload Excel file, get headers + auto-mapping + sample
   */
  @Post('upload')
  @RequirePermissions(Permission.IMPORT_EXECUTE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype.includes('spreadsheet') ||
          file.mimetype.includes('excel') ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.xls')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos Excel (.xlsx)'), false);
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    return this.importService.uploadAndParse(file, userId);
  }

  /**
   * Step 2: Preview — validate with given mapping
   */
  @Post(':jobId/preview')
  @RequirePermissions(Permission.IMPORT_EXECUTE)
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingJson: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(mappingJson);
    } catch {
      throw new BadRequestException('Mapping inválido');
    }
    return this.importService.preview(jobId, file, mapping);
  }

  /**
   * Step 3: Confirm import
   */
  @Post(':jobId/confirm')
  @RequirePermissions(Permission.IMPORT_EXECUTE)
  async confirm(
    @Param('jobId') jobId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.importService.confirm(jobId, userId);
  }

  /**
   * Get import job status
   */
  @Get(':jobId')
  @RequirePermissions(Permission.IMPORT_READ)
  async getJob(@Param('jobId') jobId: string) {
    return this.importService.getJob(jobId);
  }

  /**
   * List user's import jobs
   */
  @Get()
  @RequirePermissions(Permission.IMPORT_READ)
  async getJobs(@CurrentUser('sub') userId: string) {
    return this.importService.getJobs(userId);
  }
}
