import { Module } from '@nestjs/common';
import { PaquetesService } from './paquetes.service';
import { PaquetesController } from './paquetes.controller';
import { SeguimientoController } from './seguimiento.controller';

@Module({
  controllers: [PaquetesController, SeguimientoController],
  providers: [PaquetesService],
})
export class PaquetesModule {}
