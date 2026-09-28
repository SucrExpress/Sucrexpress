import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaquetesService } from './paquetes.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../common/guards/jwt-auth.guard';
import { SeguimientoController } from './seguimiento.controller';

describe('Seguimiento público de paquetes', () => {
  it('marca el controlador como público para el guard global', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SeguimientoController)).toBe(true);
  });

  const maybeSingle = jest.fn();
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  const supabase = { getAdmin: jest.fn(() => ({ from })) } as unknown as SupabaseService;
  const service = new PaquetesService(supabase);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve solo los campos públicos del paquete', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        numero_guia: 'GS-123-456',
        estado: 'en_ruta',
        ciudad_destino: 'Sucre',
        created_at: '2026-09-27T12:00:00Z',
        updated_at: '2026-09-27T13:00:00Z',
        fecha_asignacion: '2026-09-27T12:30:00Z',
        fecha_entrega: null,
        nombre_destinatario: 'Dato privado',
        telefono_destinatario: 'Dato privado',
      },
      error: null,
    });

    const result = await service.getSeguimiento(' GS-123-456 ');

    expect(select).toHaveBeenCalledWith(
      'numero_guia, estado, ciudad_destino, created_at, updated_at, fecha_asignacion, fecha_entrega',
    );
    expect(eq).toHaveBeenCalledWith('numero_guia', 'GS-123-456');
    expect(result.data).toEqual({
      numero_guia: 'GS-123-456',
      estado: 'en_ruta',
      ciudad_destino: 'Sucre',
      created_at: '2026-09-27T12:00:00Z',
      updated_at: '2026-09-27T13:00:00Z',
      fecha_asignacion: '2026-09-27T12:30:00Z',
      fecha_entrega: null,
    });
  });

  it('rechaza guías inválidas sin consultar la base de datos', async () => {
    await expect(service.getSeguimiento('x')).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('informa cuando la guía no existe', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(NotFoundException);
  });
});
