import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaquetesService } from './paquetes.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../common/guards/jwt-auth.guard';
import { SeguimientoController } from './seguimiento.controller';

// ─── Helpers de mock para la cadena Supabase ────────────────────────────────
const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));
const supabase = {
  getAdmin: jest.fn(() => ({ from })),
} as unknown as SupabaseService;
const service = new PaquetesService(supabase);

beforeEach(() => jest.clearAllMocks());

// ────────────────────────────────────────────────────────────────────────────
describe('SeguimientoController — decoradores', () => {
  it('marca la CLASE como pública para que el guard global la omita', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SeguimientoController)).toBe(
      true,
    );
  });

  it('el método consultar existe y es una función', () => {
    // Referencia tipada para evitar unbound-method
    const proto = SeguimientoController.prototype as { consultar?: unknown };
    expect(typeof proto.consultar).toBe('function');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('PaquetesService.getSeguimiento — contrato HTTP SUCRE-48', () => {
  // ── 200 OK: campos públicos únicamente ────────────────────────────────────
  it('200 — devuelve solo los campos públicos (sin nombre, teléfono, dirección)', async () => {
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
        direccion_exacta: 'Calle Privada 123',
      },
      error: null,
    });

    const result = await service.getSeguimiento(' GS-123-456 ');

    expect(select).toHaveBeenCalledWith(
      'numero_guia, estado, ciudad_destino, created_at, updated_at, fecha_asignacion, fecha_entrega',
    );
    expect(eq).toHaveBeenCalledWith('numero_guia', 'GS-123-456');

    expect(result.data).not.toHaveProperty('nombre_destinatario');
    expect(result.data).not.toHaveProperty('apellido_destinatario');
    expect(result.data).not.toHaveProperty('telefono_destinatario');
    expect(result.data).not.toHaveProperty('direccion_exacta');
    expect(result.data).not.toHaveProperty('ci_destinatario');
    expect(result.data).not.toHaveProperty('email_destinatario');

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

  it('200 — incluye fecha_entrega cuando el paquete fue entregado', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        numero_guia: 'GS-999-000',
        estado: 'entregado',
        ciudad_destino: 'Cochabamba',
        created_at: '2026-09-20T10:00:00Z',
        updated_at: '2026-09-21T16:00:00Z',
        fecha_asignacion: '2026-09-21T08:00:00Z',
        fecha_entrega: '2026-09-21T16:00:00Z',
      },
      error: null,
    });

    const result = await service.getSeguimiento('GS-999-000');
    expect(result.data.fecha_entrega).toBe('2026-09-21T16:00:00Z');
    expect(result.data.estado).toBe('entregado');
  });

  it('200 — maneja el estado fallido (verificado en el frontend de seguimiento)', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        numero_guia: 'GS-FALL-001',
        estado: 'fallido',
        ciudad_destino: 'Sucre',
        created_at: '2026-09-25T10:00:00Z',
        updated_at: '2026-09-26T10:00:00Z',
        fecha_asignacion: '2026-09-26T08:00:00Z',
        fecha_entrega: null,
      },
      error: null,
    });

    const result = await service.getSeguimiento('GS-FALL-001');
    expect(result.data.estado).toBe('fallido');
  });

  // ── 400 — guía inválida (sin consultar BD) ────────────────────────────────
  it('400 — rechaza guía de un solo carácter sin llamar a Supabase', async () => {
    await expect(service.getSeguimiento('x')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía con solo 2 caracteres', async () => {
    await expect(service.getSeguimiento('AB')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía con carácter ilegal (espacio interno)', async () => {
    await expect(service.getSeguimiento('GS 123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía con carácter ilegal (arroba)', async () => {
    await expect(service.getSeguimiento('GS@123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía vacía (solo espacios)', async () => {
    await expect(service.getSeguimiento('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(from).not.toHaveBeenCalled();
  });

  // ── 404 — guía válida pero inexistente ────────────────────────────────────
  it('404 — informa que la guía no existe cuando Supabase devuelve null', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── 503 — resultado {error} de Supabase ───────────────────────────────────
  it('503 — fallo estructural de Supabase ({ error }) lanza ServiceUnavailableException', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection refused', code: 'PGRST000' },
    });

    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('503 — el mensaje de {error} de Supabase no contiene detalles internos', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'SSL SYSCALL error: EOF detected', code: 'XX000' },
    });

    try {
      await service.getSeguimiento('GS-123-456');
    } catch (err: unknown) {
      const resp =
        err instanceof ServiceUnavailableException
          ? (err.getResponse() as { message?: string })
          : null;
      const message: string =
        resp?.message ?? (err instanceof Error ? err.message : '');

      expect(message).not.toMatch(/SSL/i);
      expect(message).not.toMatch(/SYSCALL/i);
      expect(message).not.toMatch(/EOF/i);
      expect(message).not.toMatch(/PGRST/i);
      expect(message).not.toMatch(/connection/i);
      expect(message.length).toBeGreaterThan(0);
    }
  });

  // ── 503 — promesa rechazada del cliente Supabase ──────────────────────────
  it('503 — promesa rechazada por Supabase (mockRejectedValue) lanza ServiceUnavailableException', async () => {
    maybeSingle.mockRejectedValue(new Error('Network timeout'));

    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('503 — el mensaje de promesa rechazada no filtra detalles internos', async () => {
    maybeSingle.mockRejectedValue(
      new Error('Network timeout — socket hang up'),
    );

    try {
      await service.getSeguimiento('GS-123-456');
    } catch (err: unknown) {
      const resp =
        err instanceof ServiceUnavailableException
          ? (err.getResponse() as { message?: string })
          : null;
      const message: string =
        resp?.message ?? (err instanceof Error ? err.message : '');

      expect(message).not.toMatch(/Network/i);
      expect(message).not.toMatch(/timeout/i);
      expect(message).not.toMatch(/socket/i);
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('503 — excepción nativa de red no re-lanza como 500', async () => {
    maybeSingle.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(
      service.getSeguimiento('GS-123-456'),
    ).rejects.not.toBeInstanceOf(TypeError);
  });

  // ── trim antes de validar ──────────────────────────────────────────────────
  it('normaliza espacios al inicio y final antes de validar y consultar', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        numero_guia: 'GS-TRIM-001',
        estado: 'pendiente',
        ciudad_destino: 'Tarija',
        created_at: '2026-09-27T10:00:00Z',
        updated_at: '2026-09-27T10:00:00Z',
        fecha_asignacion: null,
        fecha_entrega: null,
      },
      error: null,
    });

    await service.getSeguimiento('  GS-TRIM-001  ');
    expect(eq).toHaveBeenCalledWith('numero_guia', 'GS-TRIM-001');
  });
});
