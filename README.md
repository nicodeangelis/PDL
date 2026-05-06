# Torneo Pádel (PDL)

Web app mobile first para gestionar **jugadores**, **torneos** (americano por parejas) y **resultados**, con persistencia en **Vercel KV / Upstash Redis**.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Completá KV_REST_API_URL y KV_REST_API_TOKEN desde Vercel o Upstash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

1. Creá el repositorio en GitHub y subí este código.
2. En Vercel: **Add New Project** → importá el repo.
3. En **Storage**, enlazá una base **Redis** (sustituto de KV); Vercel inyecta `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
4. Deploy.

## Flujo de uso

- **Jugadores**: alta con nombre completo y nivel (1–7). Cada jugador tiene **performance** e **historial** por torneo (tras guardar partidos).
- **Torneos**: fecha, nombre opcional, canchas, minutos por partido y descanso. Elegís participantes (múltiplo de 4) o creás jugadores en línea.
- **Fixture**: generación automática con la misma lógica que `torneo-padel.jsx` (parejas por nivel + round-robin). Podés reordenar partidos, editar equipos, sumar partidos manuales y cargar resultados; **Guardar partidos** persiste y actualiza estadísticas globales.
- **Tabla**: posiciones con puntos 3/1/0 y desempate por diferencia de games.

Los datos no se consultan en bucle: se cargan al abrir cada pantalla o al pulsar **Actualizar**.

## Referencia original

La lógica de fixture y la estética (Tailwind stone/amber, Lucide) provienen del prototipo `torneo-padel.jsx` en este repo.
