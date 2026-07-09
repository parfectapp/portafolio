# PANGEA — simulador de dios

God game 2D pixel-art estilo Stardew Valley: una tribu autónoma evoluciona de la **Edad de Piedra** a una **civilización interplanetaria** mientras tú la bendices o la castigas.

## Correr

```bash
python3 -m http.server 4268 --directory .
# → http://localhost:4268
```

## Cómo se juega

- Los aldeanos viven solos: recolectan, cazan, cultivan, talan, minan, construyen, rezan, nacen y mueren.
- Tú solo tienes **milagros** (cuestan fe): Lluvia, Sol, Rayo, Bendición, Bosque, Terraformar (Shift = hundir), Inspiración, Meteorito.
- La **fe** crece con la oración… y con el temor. El **saber** desbloquea las 8 eras.
- Estaciones reales: en invierno no crecen cultivos — el pueblo debe almacenar en graneros.
- Meta: construir la plataforma espacial y lanzar el cohete → **victoria interplanetaria** (Colonia Nova).

Controles: arrastrar = mover cámara · rueda = zoom · 1–8 = poderes · espacio = pausa · clic = inspeccionar aldeano/edificio · minimapa clicable.

## Técnica

- Vanilla JS + canvas, cero dependencias. Pixel art 100% procedimental (sprites ASCII horneados a canvas).
- Simulación pura sin DOM (`js/sim.js`) → balance validado headless en Node:

```bash
node test/balance.mjs [seed]
```

8/8 seeds ganan solos (mayoría día 53–66 ≈ 40–50 min a 1×, ~15 min a 3×). Sin milagros; con ellos es más rápido.

- Autosave en localStorage cada 25 s (`pangea_save`) + botón CONTINUAR.
- Debug en consola: `__pangea.estado()`, `__pangea.fe(n)`, `__pangea.saber(n)`, `__pangea.era(i)`, `__pangea.vel(s)`.
