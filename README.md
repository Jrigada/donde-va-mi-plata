# ¿Dónde va mi plata?

Analizador de extractos bancarios de Banco Galicia. 100% privado, corre en tu navegador.

**https://dondevamiplata.vercel.app**

## Qué hace

- Parsea PDFs de extractos de caja de ahorro y cuenta corriente
- Categoriza gastos automáticamente
- Detecta suscripciones recurrentes
- Muestra impuestos y percepciones
- Compara múltiples meses

## Privacidad

Tu archivo nunca sale de tu computadora. No hay backend, no hay base de datos, no hay APIs. Todo el procesamiento ocurre en el navegador con JavaScript.

Podés verificarlo vos mismo abriendo DevTools → Network mientras subís un archivo.

## Correr localmente

```bash
npm install
npm run dev
```

## Contribuir templates de otros bancos

Si tu banco no está soportado, podés contribuir un extracto anonimizado. La herramienta de ofuscación está en la página principal - reemplaza todos los datos personales localmente antes de descargar.

## Licencia

MIT
