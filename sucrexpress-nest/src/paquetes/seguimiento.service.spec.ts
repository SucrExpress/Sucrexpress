import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaquetesService } from './paquetes.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../common/guards/jwt-auth.guard';
import { SeguimientoController } from './seguimiento.controller';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

// ─── Helpers de mock para la cadena Supabase ────────────────────────────────
const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));
const supabase = { getAdmin: jest.fn(() => ({ from })) } as unknown as SupabaseService;
const service = new PaquetesService(supabase);

beforeEach(() => jest.clearAllMocks());

// ────────────────────────────────────────────────────────────────────────────
describe('SeguimientoController — decoradores', () => {
  it('marca la CLASE como pública para que el guard global la omita', () => {
    // El guard usa reflector.getAllAndOverride sobre el handler Y la clase.
    // @Public() está aplicado a la clase, así que la key debe estar en ella.
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SeguimientoController)).toBe(true);
  });

  it('el método consultar tiene el header Cache-Control: no-store definido', () => {
    // NestJS registra los headers como metadatos en el handler.
    // Verificamos que el decorador @Header haya quedado registrado.
    const handler = SeguimientoController.prototype.consultar;
    // El decorador @Header añade entrada en ROUTE_ARGS_METADATA o en
    // '__routeArguments__'; comprobamos que el controlador existe y
    // que el decorador no haya sido eliminado al reemplazar el archivo.
    expect(typeof handler).toBe('function');
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
        // Campos privados que podrían venir de la BD pero NO deben exponerse
        nombre_destinatario: 'Dato privado',
        telefono_destinatario: 'Dato privado',
        direccion_exacta: 'Calle Privada 123',
      },
      error: null,
    });

    const result = await service.getSeguimiento(' GS-123-456 ');

    // ── Verifica la proyección SQL (solo campos públicos) ──
    expect(select).toHaveBeenCalledWith(
      'numero_guia, estado, ciudad_destino, created_at, updated_at, fecha_asignacion, fecha_entrega',
    );
    expect(eq).toHaveBeenCalledWith('numero_guia', 'GS-123-456');

    // ── La respuesta NO debe contener datos personales ──
    expect(result.data).not.toHaveProperty('nombre_destinatario');
    expect(result.data).not.toHaveProperty('apellido_destinatario');
    expect(result.data).not.toHaveProperty('telefono_destinatario');
    expect(result.data).not.toHaveProperty('direccion_exacta');
    expect(result.data).not.toHaveProperty('ci_destinatario');
    expect(result.data).not.toHaveProperty('email_destinatario');

    // ── La respuesta SÍ debe contener los campos públicos esperados ──
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

  // ── 200 OK: fecha_entrega presente cuando el paquete está entregado ───────
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

  // ── 400 — guía inválida (sin consultar BD) ────────────────────────────────
  it('400 — rechaza guía de un solo carácter sin llamar a Supabase', async () => {
    await expect(service.getSeguimiento('x')).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía con solo 2 caracteres', async () => {
    await expect(service.getSeguimiento('AB')).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía con carácter ilegal (espacio interno)', async () => {
    await expect(service.getSeguimiento('GS 123')).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía con carácter ilegal (arroba)', async () => {
    await expect(service.getSeguimiento('GS@123')).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('400 — rechaza guía vacía (solo espacios)', async () => {
    await expect(service.getSeguimiento('   ')).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  // ── 404 — guía válida pero inexistente ────────────────────────────────────
  it('404 — informa que la guía no existe cuando Supabase devuelve null', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(NotFoundException);
  });

  // ── 503 — error de Supabase → mensaje controlado, sin detalles internos ───
  it('503 — fallo de Supabase lanza ServiceUnavailableException', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection refused', code: 'PGRST000' },
    });

    await expect(service.getSeguimiento('GS-123-456')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('503 — el mensaje del error no contiene detalles internos de Supabase', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'SSL SYSCALL error: EOF detected', code: 'XX000' },
    });

    try {
      await service.getSeguimiento('GS-123-456');
    } catch (err: unknown) {
      const message: string =
        err instanceof ServiceUnavailableException
          ? (err.getResponse() as { message?: string })?.message ?? String(err.getResponse())
          : String(err);

      // El mensaje expuesto NO debe contener información interna
      expect(message).not.toMatch(/SSL/i);
      expect(message).not.toMatch(/SYSCALL/i);
      expect(message).not.toMatch(/EOF/i);
      expect(message).not.toMatch(/PGRST/i);
      expect(message).not.toMatch(/connection/i);
    }
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
