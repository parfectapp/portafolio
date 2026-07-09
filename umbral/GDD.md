# UMBRAL — Documento de Diseño (GDD)
### Un metroidvania original de 0 a 100, construido sobre la anatomía completa de *Hollow Knight*

> **Regla de oro:** UMBRAL es un **homenaje de diseño**, no un clon de assets. Se extrae la *anatomía* de Hollow Knight (números, sistemas, sensaciones, filosofía musical) y se reconstruye con **mundo, nombres, arte y música 100% originales**. Nada de Team Cherry se copia: ni sprites, ni melodías, ni textos.

---

# PARTE I — EXTRACCIÓN: TODO LO QUE SABEMOS DE HOLLOW KNIGHT

## 1. Ficha técnica

| Campo | Dato |
|---|---|
| Desarrollador | Team Cherry (Adelaida, Australia — ~3 personas núcleo) |
| Lanzamiento | 24 feb 2017 (PC), 2018 (Switch/PS4/Xbox) |
| Origen | Kickstarter 2014: **AU$57,138** recaudados (meta AU$35k) |
| Género | Metroidvania 2D / action-adventure |
| Motor | Unity, arte dibujado a mano |
| Precio | US$15 (contenido de juego de $60 — parte clave de su leyenda) |
| Compositor | Christopher Larkin |
| DLCs | Todos gratis: Hidden Dreams, The Grimm Troupe, Lifeblood, Godmaster |
| Secuela | Silksong (sept 2025) |

## 2. Recepción y ratings (verificado julio 2026)

- **Metacritic (PC): 87** — aclamación crítica generalizada.
- **Steam: ~97/100, "Overwhelmingly Positive"** con **+517,000 reseñas** — uno de los juegos mejor valorados de toda la plataforma.
- **Dueños en Steam: 5–10 millones** (SteamSpy); ingresos brutos estimados **+$300M USD** de por vida (estimaciones de trackers).
- Considerado de forma casi unánime **el mejor metroidvania moderno** y uno de los mejores indies de la historia.

**Qué repiten los críticos y jugadores (temas dominantes de las reseñas):**
1. *Atmósfera* — el reino se siente antiguo, triste y vivo; la melancolía es el producto.
2. *Combate justo* — cuando mueres, sabes que fue tu culpa. Nunca se siente barato.
3. *Respeto al jugador* — no hay marcadores de misión; el juego confía en tu curiosidad.
4. *Valor absurdo* — 40–60 horas de contenido por $15.
5. *Música* — citada constantemente como la mitad de la experiencia emocional.
6. Crítica común: el inicio es lento y la falta de guía frustra a algunos; el mapa que hay que *comprar* divide opiniones.

## 3. Anatomía del combate (los números sagrados)

El sistema es **matemática de cabeza** — todo es múltiplo simple:

| Sistema | Valor en HK | Por qué funciona |
|---|---|---|
| ALMA por golpe de aguijón | **11** | 3 golpes ≈ 1 cura. Cuenta mental instantánea. |
| Coste de cura / hechizo | **33** | Uno u otro: economía de decisión constante. |
| Alma máxima | **99** | 3 usos guardados. Nunca "banco infinito". |
| Vida inicial | 5 máscaras | Daños de 1 o 2. Legible siempre. |
| Cura (Focus) | canalizada ~0.9s, inmóvil | La cura es una **apuesta**: te expone. Inspirado en Bloodborne (recuperas vida agrediendo). |
| Golpe de aguijón | recoil en ambos: tú retrocedes, el enemigo también | El combate "respira"; evita el machaque pegado. |
| Pogo (golpe abajo en el aire) | rebote que **resetea dash y salto** | Convierte enemigos y peligros en plataformas. Techo de habilidad altísimo. |
| Hit-stop | ~2-4 frames de congelación al conectar | El golpe "pesa" sin animaciones caras. |

**El bucle genial:** para curarte necesitas alma → el alma sale de golpear → golpear te acerca al peligro. Agresión y supervivencia son el mismo botón mental. Los hechizos compiten por el mismo recurso que la cura: cada 33 de alma es una decisión.

## 4. Muerte: la mecánica de la Sombra

- Al morir sueltas una **Sombra** en el lugar de la muerte con TODO tu dinero (geo) y el medidor de alma dañado.
- Reapareces en el último **banco** donde descansaste.
- Debes volver y **matar a tu propia sombra** para recuperarlo. Si mueres antes, lo pierdes para siempre.
- Efecto psicológico: la muerte duele pero genera un *objetivo inmediato* (el "corpse run" de Dark Souls). Convierte la frustración en motivación.

## 5. Bancos, mapa y respeto al jugador

- **Bancos** = checkpoint + cura total + respawn de enemigos + único lugar para cambiar amuletos. Encontrar un banco tras una zona hostil es un *alivio diseñado*: el juego mide la distancia entre bancos como curva de tensión.
- **Mapa**: no existe hasta que encuentras al cartógrafo en cada zona y lo compras; tu posición solo se ve con un amuleto (Brújula). El mapeo es *mecánica*, no UI. Genera la sensación de exploración real.
- **Cero flechas de misión.** La señalética es ambiental: luz, arquitectura, sonido que cambia cerca de secretos.

## 6. Amuletos (charms) y muescas

- ~45 amuletos, cada uno cuesta 1–5 **muescas**; empiezas con 3 muescas, terminas con 11.
- Solo se cambian en bancos → el loadout es un *compromiso*, no un menú vivo.
- Cada efecto es comprensible en una frase ("+alma al golpear", "cura más rápido", "muestra tu posición"). Complejidad emergente con piezas simples: build de hechizos, build de aguijón, build de explorador.

## 7. Movimiento y game-feel (el 50% invisible)

Habilidades en orden aproximado de obtención — cada una **reescribe el mapa entero**:
1. **Dash** (Manto de Polilla) — huecos amplios, esquiva.
2. **Salto de pared** (Garra de Mantis) — verticalidad.
3. **Hechizo proyectil** — romper obstáculos a distancia.
4. **Doble salto** (Alas de Monarca) — reabre TODO el mapa.
5. Superdash, nado en ácido, dash sombra… (gating tardío)

Detalles de feel extraídos (los que separan "bien" de "delicioso"):
- **Coyote time** (~0.1s para saltar tras dejar el borde) + **jump buffering** (el salto pulsado un instante antes de aterrizar se ejecuta).
- Salto de altura variable (soltar corta el impulso).
- Aceleración casi instantánea: el knight responde en 1-2 frames. Cero "patinaje".
- Partículas y polvo en CADA acción: aterrizar, dash, girar, golpear paredes.
- Screen shake pequeño y seco en impactos; grande solo en momentos jefe.
- Los enemigos muertos sueltan **cadáveres físicos** que ruedan — el mundo reacciona.
- Cámara con *lookahead* suave hacia donde miras/te mueves.

## 8. Estructura del mundo

- Un solo mapa interconectado (~15 zonas) colgando de un pueblo-hub superior (Dirtmouth): **todo desciende**. La verticalidad ES la narrativa: más profundo = más antiguo, más oscuro, más verdad.
- Cada zona tiene: paleta propia, instrumentación musical propia, fauna propia, un banco, un cartógrafo, 1-2 jefes y un **atajo de vuelta** (loop de Dark Souls: el mundo se pliega sobre sí mismo).
- Gating doble: por habilidad (no llegas) y por dificultad (llegas pero te destrozan).
- Historia contada por **ambiente y NPCs opcionales**, jamás por cinemáticas obligatorias. Reino insecto muerto por una infección de luz; tú eres un recipiente vacío. Todo se puede ignorar y el juego funciona.

## 9. Jefes (filosofía)

- ~30-47 jefes. Regla de diseño: **cada ataque se telegrafía** (anticipación clara ~0.4-0.6s), los patrones son legibles, la dificultad viene de la *composición* de patrones, no del caos.
- Arena cerrada con puertas que se sellan + música de jefe propia + barra de vida con nombre.
- Fases al 66%/33% de vida que añaden un patrón, no que cambian el juego.
- El jefe enseña: cada uno es un examen de una habilidad (pogo, esquiva, paciencia).

## 10. La música de Christopher Larkin (extracción del estilo)

Verificado de entrevistas y análisis publicados:
- El encargo de Team Cherry fue literal: **"elegancia oscura"** con **instrumentación mínima**.
- **Todo empezó como piezas de piano solo**, orquestadas después. El piano es el alma del score.
- **Instrumentación por zona**: arpa/marimba para zonas de naturaleza, órgano para lugares "sagrados/académicos", cuerdas para la ciudad, coro para lo divino/final.
- **Leitmotivs**: 1-2 temas simples que reaparecen transformados (tempo, tonalidad, registro) en decenas de pistas — el pegamento emocional del juego. El tema del título vuelve en el jefe final.
- Mucho **silencio y ambiente**: zonas enteras casi sin música (solo drones y goteos) para que cuando entra el tema, golpee.
- La lluvia perpetua de la ciudad se mezcla CON la música como un instrumento más.
- Jefes: cuerdas staccato + timbales + coros — épica contenida, nunca metal ni sintetizadores.
- Referencias del propio Larkin: Ocarina of Time, FF7.

**Receta destilada para componer "a lo Larkin" (original):** modo menor (eólico/dórico), tempo lento 60-90 bpm en exploración / 120-140 en jefes, melodía de piano de 4-8 notas con muchos silencios, pads de cuerdas en quintas y octavas, bajo pedal, coro en clímax, reverb de catedral, y UN leitmotiv central que se transforma por zona.

---

# PARTE II — UMBRAL: EL JUEGO QUE CONSTRUIMOS

## 11. Concepto

> **UMBRAL** — *Eres la Pavesa, la última chispa de un reino que se apagó.
> Desciende. Enciende las brasas. Descubre por qué la Lumbre enloqueció.*

Inversión temática original respecto a HK: allá eras *vacío* contra una infección de *luz*; aquí eres **la última luz** descendiendo por un reino **ahogado en niebla y ceniza**. Fuego frágil vs. oscuridad, no vacío vs. luz.

- **Protagonista:** la **Pavesa** — figura pequeña encapuchada, cabeza-farol pálida, dos ojos oscuros, capa de ceniza. Silueta limpia, legible a 20px.
- **Arma:** la **Espina** (un alfiler de obsidiana).
- **Recurso mágico:** **Ánima** (orbe que se llena al golpear).
- **Moneda:** **Esquirlas**.
- **Checkpoints:** **Brasas** (te sientas y las reavivas — el fuego prende, la pantalla entibia).
- **Muerte:** sueltas tu **Rescoldo** con todas las esquirlas; vuelve y golpéalo para recuperarlas.
- **Idioma:** todo en español.

## 12. Los números de UMBRAL (heredados y ajustados)

| Sistema | Valor | Nota |
|---|---|---|
| Ánima por golpe | **11** | El número sagrado se queda. |
| Coste cura/hechizo | **33** | Igual. |
| Ánima máxima | **99** | Igual. |
| Vida | **5 candelas** (máx 7 con reliquias) | |
| Daño de Espina | 5 | Enemigos: 5–30 HP (1–6 golpes). |
| Hechizo (Chispa Errante) | 15 de daño, proyectil | Se obtiene en altar de zona 1. |
| Cura (Rezo) | 0.85 s canalizada, inmóvil, solo en suelo | |
| Velocidad de carrera | 260 px/s, aceleración 1-2 frames | |
| Salto | −620 px/s, altura variable, coyote 0.09s, buffer 0.12s | |
| Dash | 520 px/s × 0.18s, cooldown 0.45s, sin gravedad | |
| Salto de pared | deslizamiento a 140 px/s máx; salto ±330/−540 | |
| Doble salto | −560 px/s con estallido de vilanos | |
| Pogo (golpe ↓ aéreo) | rebote −520, **resetea dash y doble salto** | |
| Hit-stop | 45 ms al conectar; 120 ms al recibir daño | |
| I-frames al recibir daño | 1.2 s con parpadeo | |
| Muescas de reliquia | 3 | 4 reliquias en el mundo. |

## 13. Habilidades (progresión que reescribe el mapa)

1. **Chispa Errante** (hechizo) — altar en las Sendas. Proyectil, 33 ánima.
2. **Manto de Ceniza** (dash) — botín del jefe 1. Abre los huecos hacia la Hondonada.
3. **Garra de Sílex** (salto de pared) — santuario en la Hondonada. Abre la verticalidad de la Ciudad.
4. **Alas de Vilano** (doble salto) — botín del jefe 2. Abre el descenso a la Hondura.

## 14. El mundo: 4 zonas, ~20 salas, todo desciende

```
            [SENDAS CENIZAS]  ← inicio, gris azulado, polvo
                  │  (jefe: GUARDIÁN ROTO → dash)
        ┌─────────┴──────────┐
   [HONDONADA VERDE]         │     ← musgo, esporas, arpa
   (garra de sílex)          │
        └─────────┬──────────┘
           [CIUDAD ANEGADA]        ← lluvia eterna, ventanas cálidas, piano
                  │  (jefe: REGENTE AHOGADO → doble salto)
             [LA HONDURA]          ← negro casi total, ojos rojos, drones
                  │  (jefe final: LA LUMBRE)
               [EL ALBA]           ← final
```

| Zona | Paleta | Ambiente | Música |
|---|---|---|---|
| Sendas Cenizas | gris-azul frío, borde pálido | polvo flotante | piano escaso en La menor, drone grave |
| Hondonada Verde | verde profundo + lima pálido | esporas, lianas | arpa arpegiada en Mi menor, flauta |
| Ciudad Anegada | azul marino + ventanas ámbar | LLUVIA perpetua + destellos | balada de piano en Fa# menor + cuerdas + la lluvia como instrumento |
| La Hondura | negro, acento rojo | oscuridad con radio de luz propia, ojos | sin melodía: drone, latido de timbal, blips disonantes |
| Jefes | paleta de zona + rojo | polvo de batalla | Re menor 132bpm: timbales+cuerdas staccato+coro |

Cada zona: 1 brasa mínimo, 1 estela de lore, 1 reliquia, fauna propia, y un atajo de regreso.

## 15. Bestiario

| Enemigo | HP | Comportamiento | Zona |
|---|---|---|---|
| **Rastrero** | 8 | patrulla bordes, contacto 1 dmg | todas |
| **Zumbón** | 6 | flota en seno; al verte, persigue flotando | Sendas/Ciudad |
| **Escupidor** | 10 | planta fija, lanza proyectiles en arco | Hondonada |
| **Acorazado** | 14 | bloquea golpes frontales (chispazo + recoil), vulnerable por detrás/arriba | Ciudad/Hondura |
| **Tejedora** | 12 | cuelga de hilo, cae al pasar, trepa de vuelta | Hondura |

## 16. Jefes

**GUARDIÁN ROTO** (Sendas, 180 HP) — armadura vacía que aún cumple órdenes.
Patrones: salto-embestida hacia tu X con onda de choque al aterrizar; triple brinco; fase 2 (≤50%): caen escombros del techo. Enseña: esquivar con timing, pogo opcional sobre su cabeza.

**REGENTE AHOGADO** (Ciudad, 220 HP) — el rey que abrió las compuertas.
Patrones: se teletransporta entre 5 anclas; 3 orbes lentos teledirigidos; lanzas de lluvia (líneas telegrafiadas que caen); anillo de púas radial. Fase 2: más rápido + oleada de agua a ras de suelo (saltable). Enseña: gestión de espacio aéreo, uso del dash.

**LA LUMBRE** (Hondura, 300 HP, final) — la luz del reino, enloquecida de soledad.
Patrones: anillos radiales de orbes; barrido de rayo (línea fina telegrafiada → haz); embestidas en cruz; paredes de chispas. Fase 3 (≤33%): desesperación radial + blancos de pantalla. Al morir: cámara lenta, fundido blanco → **EL ALBA** (final + estadísticas: tiempo, muertes, esquirlas, reliquias).

Todos: puertas selladas, barra con nombre, telegrafia 0.4-0.6s, música propia, sin daño barato.

## 17. Reliquias (4, muescas 3)

| Reliquia | Muescas | Efecto | Dónde |
|---|---|---|---|
| **Corazón de Musgo** | 2 | +1 candela | Hondonada |
| **Piedra de Ánima** | 1 | hechizo +50% daño | Ciudad (archivo) |
| **Rezo Veloz** | 1 | cura 35% más rápida | Sendas (alcoba del pozo) |
| **Imán de Esquirlas** | 1 | atrae esquirlas | Hondura |

Solo se cambian sentado en una brasa (el compromiso de HK se conserva).

## 18. Música original (motor WebAudio, cero samples)

Sintetizador propio — instrumentos construidos con osciladores y filtros:
- **Piano**: 2 triángulos desafinados + lowpass + envolvente percusiva + reverb.
- **Cuerdas**: 4 sierras desafinadas, ataque lento, filtro con LFO.
- **Coro**: sierras por bandas formantes (~700/1200 Hz).
- **Arpa/pluck**: decay rápido brillante.
- **Timbal/taiko**: seno con caída de pitch + ráfaga de ruido.
- **Reverb catedral**: convolución con impulso generado (ruido con decay exponencial 2.5s).

**Leitmotiv de UMBRAL** (original, Re menor): *D–F–E–C#–D* ("la chispa que no se apaga"). Aparece: lento y desnudo en el título; disfrazado en arpa en la Hondonada; en balada en la Ciudad; a todo coro y timbales contra La Lumbre; en mayor (Re mayor) en El Alba.
Temas: título, 4 zonas, jefe, jefe final, alba — con crossfade de 1.5-2s entre salas de zonas distintas. La lluvia de la Ciudad suena SIEMPRE, mezclada bajo la música.

SFX sintetizados: espina (ping metálico+ruido), impacto, daño (golpe sordo grave), salto, dash (soplido), rezo (shimmer ascendente), esquirlas (tick cristalino), muerte (boom + campana), rugido de jefe.

## 19. Dirección de arte (regla: cero AI-slop)

- Vector/canvas 2D dibujado por código: **siluetas de tinta** sobre niebla en profundidad — 3 capas de parallax por zona + gradiente de niebla + partículas.
- 1 acento de color por zona. Nada de neón, nada de glow gratuito; luz = información (brasas, ánima, ojos).
- Terreno: silueta casi negra con borde superior iluminado sutil + flecos procedurales (hierba, musgo, raíces colgantes, estalactitas) sembrados por semilla fija.
- Oscuridad real en la Hondura: la Pavesa emite un radio de luz.
- Vignette permanente; lluvia en diagonal en la Ciudad con salpicaduras.
- Tipografía: serif del sistema con tracking amplio para títulos, mono para HUD.

## 20. UX / HUD / Meta

- HUD: candelas (llamas), orbe de ánima (se llena como arco), esquirlas, reliquias equipadas. Rótulo de zona al entrar (fade elegante).
- **Mapa (M/Tab)**: salas visitadas como rectángulos conectados, tu posición, brasas marcadas.
- Menú de brasa: descansar (cura + respawn + guardar) / reliquias.
- Estelas de lore: interactuar con ↑ — texto breve, críptico, en español.
- Guardado: localStorage (`umbral_save_v1`) — habilidades, reliquias, esquirlas, brasa, salas visitadas, jefes, estadísticas.
- Título: UMBRAL con niebla viva, Continuar/Nueva partida/Controles.
- Controles: ←→/AD mover · Z/Espacio saltar · X/J espina · C/K dash · ↑↓ apuntar · L (mantener) rezo · V hechizo · ↑/E interactuar · M mapa · Esc pausa.
- Debug: `window.__umbral` (god, warp, giveAll, estado).

## 21. Criterios de calidad (checklist de salida)

Verificado con arnés headless en Node (`scratchpad/test_umbral.cjs`, **25/25 pruebas verdes**):
- [x] Física: salto 3.46 tiles, carrera 260 px/s, coyote + buffer + altura variable.
- [x] Las 38 puertas del reino transicionan y ningún spawn cae en sólido.
- [x] Gate del dash: bot con física real confirma que SIN dash el foso castiga y CON dash se cruza.
- [x] Los 3 jefes: activación, puertas selladas, fases, muerte, recompensa; la Lumbre lleva al ALBA.
- [x] Muerte→Rescoldo (esquirlas retenidas)→respawn en brasa→recuperación.
- [x] Brasa: menú de reliquias, muescas, +1 candela con Corazón de Musgo.
- [x] Fuzz de 300 frames con inputs aleatorios en cada una de las 20 salas: cero excepciones/NaN.
- [x] Guardado/carga íntegro en localStorage.
- [ ] Pase de juego humano (feel fino de jefes y música) — pendiente de André.

## 22. Plan técnico

```
umbral/
├── index.html      — canvas + título DOM + CSS
├── GDD.md          — este documento
└── js/
    ├── audio.js    — sintetizador, temas, SFX
    ├── data.js     — zonas, 20 salas (grids ASCII), reliquias, estelas, mapa
    ├── entities.js — Pavesa, bestiario, 3 jefes, proyectiles, partículas
    └── game.js     — bucle, física, cámara, transiciones, HUD, render, guardado
```
Vanilla JS, sin dependencias, offline total. Puerto **4270** (`python3 -m http.server 4270`).

---
*Fuentes de la extracción: Wikipedia (Hollow Knight / Music of Hollow Knight), Steambase (517k reseñas, 97/100), SteamSpy, Metacritic, entrevistas a Christopher Larkin (Indie Game Fans, Native Instruments), análisis de diseño (GameDev.net, Medium). Análisis y síntesis propios; ningún asset del juego original se reproduce.*
