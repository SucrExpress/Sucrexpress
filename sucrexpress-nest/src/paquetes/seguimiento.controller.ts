import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/guards/jwt-auth.guard';
import { PaquetesService } from './paquetes.service';

@ApiTags('Seguimiento')
@Public()
@Controller('paquetes/seguimiento')
export class SeguimientoController {
  constructor(private readonly paquetesService: PaquetesService) {}

  @Get(':numeroGuia')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consultar el estado público de un paquete por número de guía' })
  consultar(@Param('numeroGuia') numeroGuia: string) {
    return this.paquetesService.getSeguimiento(numeroGuia);
  }
}
