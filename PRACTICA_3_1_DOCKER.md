# Práctica 3.1 — SucreExpress en Docker

La solución tiene dos contenedores: `web` (Next.js) y `api` (NestJS). Supabase permanece como servicio externo. Solo el puerto de la web se publica; `/backend/api/*` es un proxy de Next hacia la API en la red interna de Compose. Las rutas propias de Next bajo `/api/*` permanecen disponibles.

## Fase 1 — Docker Desktop y Docker Hub

1. Configurar los archivos locales `sucrexpress-next/.env` y `sucrexpress-nest/.env` a partir de sus `.env.example`. No subirlos a Git. En el backend, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_KEY` son necesarios para arrancar. `JWT_SECRET` debe coincidir en ambos servicios.
2. Desde la raíz, ejecutar `docker compose build` y `docker compose up -d`.
3. Verificar `docker compose ps`, `http://localhost:8080/login`, `http://localhost:8080/seguimiento` y el proxy del backend con `http://localhost:8080/backend/api/paquetes/seguimiento/a` (debe responder 400 por formato de guía inválido). La API no requiere publicar el puerto 3001 en el host.
4. Guardar capturas de Docker Desktop con `web` y `api` en ejecución y de la aplicación abierta en el navegador. No incluir valores de `.env`, tokens ni claves en las capturas.
5. En GitHub, configurar los secretos de Actions `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN`. El token de Docker Hub necesita permiso de escritura sobre los dos repositorios. Configurar opcionalmente la variable pública `NEXT_PUBLIC_GOOGLE_MAPS_KEY` si se usarán mapas. No proporcionar tokens por chat ni escribirlos en el repositorio.
6. Integrar la rama de Docker en `main`. El flujo `.github/workflows/dockerhub.yml` se ejecuta en cada `push` a `main` y publica `sucrexpress-web` y `sucrexpress-api` con etiquetas `latest` y el SHA del commit. Guardar capturas del run exitoso y de ambos repositorios en Docker Hub.

La web usa `NEXT_PUBLIC_NEST_API_URL=/backend` al compilarse. El valor público se incorpora al bundle; los secretos de Supabase y JWT solo se inyectan al iniciar los contenedores y no forman parte de las imágenes. En Docker Desktop el puerto 8080 se vincula solo a `127.0.0.1`; para la VM se configurará explícitamente `WEB_BIND=0.0.0.0` y `WEB_PORT=80`.

## Fase 2 — OCI manual

Esta fase se realizará después: comprobar la red y el firewall de Ubuntu, instalar Docker en la VM, descargar las dos imágenes de Docker Hub, preparar allí los archivos de entorno, ejecutar Compose y validar la web mediante la IP pública. Conservar capturas de la VM, la sesión SSH, los comandos Docker, `docker compose ps` y el navegador con la IP pública. La clave privada SSH permanece únicamente en el equipo del propietario.
