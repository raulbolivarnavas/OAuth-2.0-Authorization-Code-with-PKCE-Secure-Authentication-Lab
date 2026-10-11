# Keycloak + Next.js: laboratorio PKCE

Aplicación React con Next.js App Router. Cliente público, sin client_secret. Incluye inicio de sesión, validación de state, PKCE S256, intercambio manual del código, perfil, renovación de token y logout.

## Ejecutar en Windows / PowerShell

Instala Node.js 22 LTS o superior. Extrae el ZIP y entra a keycloak-nextjs:

```powershell
cd keycloak-nextjs
Copy-Item .env.example .env.local
npm install
npm run dev
```

Abre http://localhost:3000. Para producción local: `npm run build` y `npm start`.

## Keycloak local: JSON adjunto

El JSON entregado corresponde al realm **appstore**, cliente **appstore-web**. La configuración predeterminada apunta a http://localhost:38080 y utiliza http://localhost:3000/callback, ya permitido en ese JSON. Importa el JSON original en Keycloak con el Compose de tu entorno. No se incluye una copia de las credenciales del JSON en este proyecto.

Comprueba en el cliente:

- Client authentication: OFF (público).
- Standard flow: ON.
- PKCE: S256.
- Valid redirect URIs: http://localhost:3000/callback
- Web origins: http://localhost:3000
- Valid post logout redirect URIs: http://localhost:3000/

No hace falta habilitar Direct Access Grants. Si el realm ya existe, verifica su configuración efectiva: el import al arranque no actualiza automáticamente el existente. Si verifyEmail está activo, el usuario necesita correo verificado y resolver las acciones obligatorias.

## Usar el servidor del JavaScript original

Modifica .env.local:

```dotenv
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:38080
NEXT_PUBLIC_KEYCLOAK_REALM=appstore
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=appstore-web
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/callback
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
NEXT_PUBLIC_SCOPE=openid profile email
```

Añade las URLs de localhost:3000 a ese cliente en Keycloak. El original usaba localhost:8085; esta app usa 3000. Reinicia Next.js después de cambiar variables. NEXT_PUBLIC_* son públicas; no pongas secretos allí.

## Prueba

1. Iniciar sesión y autenticarse en Keycloak.
2. Volver a /callback y pulsar Intercambiar código inmediatamente: el JSON original da al código 60 segundos de vigencia.
3. Consultar perfil: verifica el access token contra /userinfo.
4. Renovar token y observar los nuevos valores.
5. Cerrar sesión y comprobar el regreso a la app.

La respuesta se muestra para inspección. Los tokens permanecen en sessionStorage de la pestaña, sin cookies de aplicación ni sesión del servidor. Esta es una herramienta de pruebas. Para una aplicación real conviene diseñar una sesión con cookies HttpOnly/BFF y validación de tokens. No se decodifica un JWT como prueba de validez.

Errores frecuentes: invalid_redirect_uri (URL exacta), CORS (Web origins), invalid_grant (código expirado/usado; iniciar sesión de nuevo), invalid_client (cliente incorrecto o confidencial). La app hace el token exchange directamente desde el navegador, como el ejemplo original.

Documentación: https://nextjs.org/docs/app/getting-started/installation
