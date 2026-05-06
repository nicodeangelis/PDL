import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "torneo-padel.jsx"]),
  {
    rules: {
      // Carga al montar pantalla (sin polling); efecto + fetch es el patrón habitual en cliente.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
