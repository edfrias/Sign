# Sign

Aplicación web instalable (PWA) para aprender lenguas de signos: lecciones, quizzes con
repetición espaciada y práctica de la forma de la mano con la cámara. Todo se ejecuta en el
navegador; la imagen de la cámara nunca sale del dispositivo.

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios
npm run build      # compilación de producción en dist/
```

La cámara necesita `localhost` o HTTPS.

## Documentación

- [Análisis y requisitos](docs/01-analisis.md)
- [Arquitectura](docs/02-arquitectura.md)
- [Hoja de ruta](docs/03-roadmap.md)
- [Fuentes de contenido y licencias](docs/04-fuentes.md)

## Añadir contenido

Cada lengua es una carpeta en `content/` con `signs.json` y `units.json`, más una entrada en
`content/languages.json`. Los vídeos e imágenes van en `public/media/<lengua>/` y se
referencian como `"/media/lse/a.mp4"`.

Usa solo material propio o con licencia que lo permita, e indica `credit` y `license`.
Marca `"verified": true` cuando un diccionario fiable o una persona signante haya confirmado el signo.

## Práctica con cámara

Funciona manos libres y sin calibrar: las fotos de cada letra sirven de referencia.

1. Abre **Cámara** y pulsa **Empezar práctica** (es el único clic).
2. Signa la letra que aparece en grande. Al mantenerla bien 1 segundo suena un pitido y pasa a la
   siguiente; si te atascas, se salta sola a los 20 s.
3. Opcional: **Calibración guiada** recorre las letras grabando tu mano automáticamente cuando la
   mantienes quieta, y mejora la precisión.

Si valida demasiado fácil o difícil, cambia la **Tolerancia** antes de empezar.
