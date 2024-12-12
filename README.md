# Implementación de "Verificación de consistencia eventual en programas que utilicen CRDTs mediante pruebas aleatorizadas"

Para correr el experimento se requiere NodeJS y ejecutar los siguientes comandos:

```
npm install
npx tsc
node dist/experiment.js
```

El experimento no es determinístico así que los valores varían un poco. Los resultados originales se encuentran en el archivo `results.json`. El formato de los experimentos ha cambiado y la explicación del nuevo formato se encuentra en `src/experiment.ts`.