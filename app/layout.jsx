import './globals.css';

export const metadata = {
    title: 'Keycloak · Pruebas PKCE',
    description: 'Laboratorio OAuth2 con Next.js'
};

export default function Layout({children}) {
    return <html lang="es">
    <body>{children}</body>
    </html>;
}
