import { ApiProperty } from '@nestjs/swagger';

/** Campos que se exponen públicamente en el endpoint de seguimiento.
 *  No contiene nombre, teléfono, dirección exacta ni ningún dato personal. */
export class SeguimientoDataDto {
  @ApiProperty({ example: 'GS-123-456', description: 'Número de guía del envío' })
  numero_guia: string;

  @ApiProperty({
    example: 'en_ruta',
    description: 'Estado actual del paquete',
    enum: ['pendiente', 'asignado', 'en_ruta', 'entregado', 'no_entregado'],
  })
  estado: string;

  @ApiProperty({ example: 'Sucre', description: 'Ciudad de destino del envío' })
  ciudad_destino: string;

  @ApiProperty({ example: '2026-09-27T12:00:00Z', description: 'Fecha de registro del paquete' })
  created_at: string;

  @ApiProperty({ example: '2026-09-27T13:00:00Z', description: 'Última actualización del estado' })
  updated_at: string;

  @ApiProperty({
    example: '2026-09-27T12:30:00Z',
    nullable: true,
    description: 'Fecha en que fue asignado a un repartidor',
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
