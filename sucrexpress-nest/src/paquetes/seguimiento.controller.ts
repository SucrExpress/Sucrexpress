import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/guards/jwt-auth.guard';
import { PaquetesService } from './paquetes.service';
import { SeguimientoResponseDto } from './dto/seguimiento-response.dto';

@ApiTags('Seguimiento')
@Public()
@Controller('paquetes/seguimiento')
export class SeguimientoController {
  constructor(private readonly paquetesService: PaquetesService) {}

  /**
   * GET /api/paquetes/seguimiento/:numeroGuia
   *
   * Endpoint público — no requiere JWT.
   * Devuelve únicamente los campos públicos del envío:
   * número de guía, estado, ciudad de destino y fechas relevantes.
   * Nunca expone nombre, teléfono, dirección exacta ni datos personales.
   */
  @Get(':numeroGuia')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consultar el estado público de un envío por número de guía',
    description:
      'Endpoint **público**: no requiere token JWT.\n\n' +
      'Devuelve el estado del envío sin exponer datos personales ' +
      '(sin nombre, teléfono ni dirección exacta del destinatario).\n\n' +
      'La respuesta incluye `Cache-Control: no-store` para evitar ' +
      'que información de estado quede almacenada en caché.',
  })
  @ApiParam({
    name: 'numeroGuia',
    description:
      'Número de guía del envío. Debe comenzar con un carácter alfanumérico ' +
      'y tener entre 3 y 64 caracteres (letras, dígitos, puntos, guiones, guiones bajos).',
    example: 'GS-123-456',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos públicos del envío encontrado.',
    type: SeguimientoResponseDto,
    headers: {
      'Cache-Control': {
        description: 'Siempre "no-store" para este endpoint.',
        schema: { type: 'string', example: 'no-store' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Número de guía inválido. El formato no cumple el patrón permitido ' +
      '(mínimo 3 caracteres, solo alfanuméricos, puntos, guiones o guiones bajos).',
    schema: {
      example: {
        statusCode: 400,
        message: 'Número de guía inválido',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No existe ningún envío registrado con ese número de guía.',
    schema: {
      example: {
        statusCode: 404,
        message: 'No se encontró un envío con ese número de guía',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description:
      'Error interno al consultar la base de datos. ' +
      'El mensaje no expone detalles internos ni del proveedor.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Servicio no disponible. Intente más tarde.',
        error: 'Service Unavailable',
      },
    },
  })
  consultar(@Param('numeroGuia') numeroGuia: string) {
    return this.paquetesService.getSeguimiento(numeroGuia);
  }
}
