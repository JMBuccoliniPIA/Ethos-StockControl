import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('stock')
@UseGuards(RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('movement')
  @RequirePermissions(Permission.STOCK_ADJUST)
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stockService.createMovement(dto, userId);
  }

  @Get('movements')
  @RequirePermissions(Permission.STOCK_READ)
  findMovements(@Query() query: QueryMovementDto) {
    return this.stockService.findMovements(query);
  }

  @Get('movements/:productId')
  @RequirePermissions(Permission.STOCK_READ)
  getProductMovements(
    @Param('productId') productId: string,
    @Query('limit') limit = 50,
  ) {
    return this.stockService.getProductMovements(productId, limit);
  }
}
