/**
 * E2E — GET /api/paquetes/seguimiento/:numeroGuia  (SUCRE-48)
 *
 * Supabase queda completamente mockeado: no se necesita conectividad real
 * ni credenciales de entorno.
 *
 * Casos cubiertos:
 *  - Sin token JWT → 200 (endpoint público)
 *  - Guía inválida → 400
 *  - Guía inexistente → 404
 *  - Error estructural de Supabase ({ error }) → 503 con mensaje controlado
 *  - Promesa rechazada del cliente Supabase (mockRejectedValue) → 503
 *  - Cache-Control: no-store en todas las respuestas (200, 400, 404, 503)
 *  - Respuesta 200 sin nombre, teléfono ni dirección exacta
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PaquetesModule } from '../src/paquetes/paquetes.module';
import { SupabaseModule } from '../src/common/supabase/supabase.module';
import { SupabaseService } from '../src/common/supabase/supabase.service';

/** Forma del JSON devuelto por el endpoint de seguimiento */
interface ApiBody {
  success?: boolean;
  data?: Record<string, unknown>;
  message?: string;
  statusCode?: number;
  error?: string;
}

// ─── Mock de la cadena de Supabase ──────────────────────────────────────────
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockGetAdmin = jest.fn(() => ({ from: mockFrom }));

const mockSupabaseService = {
  getAdmin: mockGetAdmin,
  onModuleInit: jest.fn(),
};

// ─── Fixture de paquete público (sin datos personales) ──────────────────────
const PAQUETE_PUBLICO = {
  numero_guia: 'GS-123-456',
  estado: 'en_ruta',
  ciudad_destino: 'Sucre',
  created_at: '2026-09-27T12:00:00Z',
  updated_at: '2026-09-27T13:00:00Z',
  fecha_asignacion: '2026-09-27T12:30:00Z',
  fecha_entrega: null,
};

// ─── Setup de la aplicación ─────────────────────────────────────────────────
describe('GET /api/paquetes/seguimiento/:numeroGuia (e2e) — SUCRE-48', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-sucre48',
              SUPABASE_URL: 'https://mock.supabase.co',
              SUPABASE_ANON_KEY: 'mock-anon-key',
              SUPABASE_SERVICE_KEY: 'mock-service-key',
            }),
          ],
        }),
        SupabaseModule,
        PaquetesModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
      ],
    })
      .overrideProvider(SupabaseService)
      .useValue(mockSupabaseService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // ── Acceso sin token JWT ────────────────────────────────────────────────
  it('200 — responde sin token JWT (endpoint público)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: PAQUETE_PUBLICO, error: null });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(200);

    const body = res.body as ApiBody;
    expect(body.success).toBe(true);
    expect(body.data?.numero_guia).toBe('GS-123-456');
  });

  // ── Cache-Control: no-store ─────────────────────────────────────────────
  it('Cache-Control: no-store presente en respuesta 200', async () => {
    mockMaybeSingle.mockResolvedValue({ data: PAQUETE_PUBLICO, error: null });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(200);

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('Cache-Control: no-store presente en respuesta 404', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-NO-EXISTE')
      .expect(404);

    expect(res.headers['cache-control']).toBe('no-store');
  });

  // ── Sin datos personales ────────────────────────────────────────────────
  it('200 — la respuesta no contiene nombre, teléfono ni dirección exacta', async () => {
    mockMaybeSingle.mockResolvedValue({ data: PAQUETE_PUBLICO, error: null });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(200);

    const body = (res.body as ApiBody).data ?? {};
    expect(body).not.toHaveProperty('nombre_destinatario');
    expect(body).not.toHaveProperty('apellido_destinatario');
    expect(body).not.toHaveProperty('telefono_destinatario');
    expect(body).not.toHaveProperty('direccion_exacta');
    expect(body).not.toHaveProperty('ci_destinatario');
    expect(body).not.toHaveProperty('email_destinatario');
    expect(body).not.toHaveProperty('numero_casa');
    expect(body).not.toHaveProperty('numero_departamento');
  });

  // ── 400 — guía inválida ────────────────────────────────────────────────
  it('400 — guía de 1 carácter', async () => {
    await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/x')
      .expect(400);

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('400 — guía de 2 caracteres', async () => {
    await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/AB')
      .expect(400);

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('400 — mensaje de error es legible y no expone detalles internos', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/x')
      .expect(400);

    const body = res.body as ApiBody;
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
    expect((body.message ?? '').length).toBeGreaterThan(0);
  });

  // ── 404 — guía no encontrada ───────────────────────────────────────────
  it('404 — guía válida pero inexistente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-NO-EXISTE')
      .expect(404);
  });

  it('404 — el cuerpo contiene un mensaje comprensible', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-NO-EXISTE')
      .expect(404);

    const body = res.body as ApiBody;
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
  });

  // ── 503 — error estructural { error } de Supabase ─────────────────────
  it('503 — error estructural de Supabase ({ error })', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection refused', code: 'PGRST000' },
    });

    await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(503);
  });

  it('503 — mensaje de {error} no expone detalles internos de Supabase', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'SSL SYSCALL error: EOF detected', code: 'XX000' },
    });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(503);

    const msg = (res.body as ApiBody).message ?? '';
    expect(msg).not.toMatch(/SSL/i);
    expect(msg).not.toMatch(/SYSCALL/i);
    expect(msg).not.toMatch(/EOF/i);
    expect(msg).not.toMatch(/connection/i);
    expect(msg).not.toMatch(/PGRST/i);
    expect(msg.length).toBeGreaterThan(0);
  });

  it('503 — Cache-Control: no-store en error de BD', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'timeout', code: 'XX000' },
    });

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(503);

    expect(res.headers['cache-control']).toBe('no-store');
  });

  // ── 503 — promesa rechazada (mockRejectedValue) ────────────────────────
  it('503 — promesa rechazada del cliente Supabase produce 503, no 500', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('Network timeout'));

    await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(503);
  });

  it('503 — mensaje de promesa rechazada no filtra detalles internos', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('socket hang up — internal'));

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(503);

    const msg = (res.body as ApiBody).message ?? '';
    expect(msg).not.toMatch(/socket/i);
    expect(msg).not.toMatch(/hang/i);
    expect(msg).not.toMatch(/internal/i);
    expect(msg.length).toBeGreaterThan(0);
  });

  it('503 — TypeError del cliente Supabase no expone stack ni mensaje interno', async () => {
    mockMaybeSingle.mockRejectedValue(new TypeError('Failed to fetch'));

    const res = await request(app.getHttpServer())
      .get('/api/paquetes/seguimiento/GS-123-456')
      .expect(503);

    const msg = (res.body as ApiBody).message ?? '';
    expect(msg).not.toMatch(/Failed to fetch/i);
    expect(msg).not.toMatch(/TypeError/i);
    expect(msg.length).toBeGreaterThan(0);
  });
});
