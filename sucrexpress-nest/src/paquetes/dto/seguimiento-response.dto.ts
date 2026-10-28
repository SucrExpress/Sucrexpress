import { ApiProperty } from '@nestjs/swagger';

/** Campos que se exponen públicamente en el endpoint de seguimiento.
 *  No contiene nombre, teléfono, dirección exacta ni ningún dato personal.
 *
 *  Estados reales verificados en la BD (tabla paquetes, tipo text):
 *  - pendiente   : Paquete registrado, sin repartidor asignado aún.
 *  - asignado    : Un repartidor aceptó el paquete.
 *  - en_ruta     : El repartidor salió a entregar.
 *  - entregado   : Entrega completada con éxito.
 *  - fallido     : Intento de entrega fallido (el frontend también lo maneja).
 */
export class SeguimientoDataDto {
  @ApiProperty({
    example: 'GS-123-456',
    description: 'Número de guía del envío',
  })
  numero_guia: string;

  @ApiProperty({
    example: 'en_ruta',
    description:
      'Estado actual del paquete. ' +
      'Valores posibles verificados en la base de datos y en el frontend de seguimiento.',
    enum: ['pendiente', 'asignado', 'en_ruta', 'entregado', 'fallido'],
  })
  estado: string;

  @ApiProperty({ example: 'Sucre', description: 'Ciudad de destino del envío' })
  ciudad_destino: string;

  @ApiProperty({
    example: '2026-09-27T12:00:00Z',
    description: 'Fecha de registro del paquete (ISO 8601)',
  })
  created_at: string;

  @ApiProperty({
    example: '2026-09-27T13:00:00Z',
    description: 'Fecha de la última actualización de estado (ISO 8601)',
  })
  updated_at: string;

  @ApiProperty({
    example: '2026-09-27T12:30:00Z',
    nullable: true,
    description:
      'Fecha en que fue asignado a un repartidor (null si aún no fue asignado)',
  })
  fecha_asignacion: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Fecha de entrega efectiva (null si aún no fue entregado)',
  })
  fecha_entrega: string | null;
}

export class SeguimientoResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SeguimientoDataDto })
  data: SeguimientoDataDto;
}
