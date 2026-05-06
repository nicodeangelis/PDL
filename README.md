# Torneo Pádel (PDL)

Web app mobile first para gestionar **jugadores**, **torneos** (americano por parejas) y **resultados**, con datos en **Redis**.

Hay dos modos (prioridad: **`REDIS_URL`** si está definida):

| Variable | Uso |
|----------|-----|
| `REDIS_URL` | Conexión **TCP** `redis://` o `rediss://` (ej. Redis Cloud). |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | API **REST** Upstash / integración Vercel clásica. |

No subas la URL con contraseña al repo; usá solo **Variables de entorno** en Vercel o `.env.local`.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# En .env.local: REDIS_URL=redis://...  O  KV_REST_API_* 
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

1. Creá el repositorio en GitHub y subí este código.
2. En Vercel: **Add New Project** → importá el repo.
3. **Settings → Environment Variables**: agregá `REDIS_URL` (Redis Cloud) o enlazá Redis del Marketplace para obtener `KV_REST_API_*`.
4. **Redeploy** tras cambiar variables.

En serverless, TCP implica una conexión por instancia fría; para mucho tráfico conviene REST (Upstash).

## Flujo de uso

- **Jugadores**: alta con nombre completo y nivel (1–7). Cada jugador tiene **performance** e **historial** por torneo (tras guardar partidos).
- **Torneos**: fecha, nombre opcional, canchas, minutos por partido y descanso. Elegís participantes (múltiplo de 4) o creás jugadores en línea.
- **Fixture**: generación automática con la misma lógica que `torneo-padel.jsx` (parejas por nivel + round-robin). Podés reordenar partidos, editar equipos, sumar partidos manuales y cargar resultados; **Guardar partidos** persiste y actualiza estadísticas globales.
- **Tabla**: posiciones con puntos 3/1/0 y desempate por diferencia de games.

Los datos no se consultan en bucle: se cargan al abrir cada pantalla o al pulsar **Actualizar**.

## Referencia original

La lógica de fixture y la estética (Tailwind stone/amber, Lucide) provienen del prototipo `torneo-padel.jsx` en este repo.
