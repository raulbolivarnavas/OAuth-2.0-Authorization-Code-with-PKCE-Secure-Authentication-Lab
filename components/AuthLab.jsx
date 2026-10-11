'use client';

import {
    useEffect,
    useRef,
    useState
} from 'react';

const config = {
    url: (process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://10.77.0.1:38080').replace(/\/$/, ''),
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'appstore',
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'appstore-web',
    redirect: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/callback',
    logoutRedirect: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000/',
    scope: process.env.NEXT_PUBLIC_SCOPE || 'openid profile email',
};

const issuer = `${config.url}/realms/${encodeURIComponent(config.realm)}`;
const endpoint = `${issuer}/protocol/openid-connect`;
const key = 'keycloak-test:';

const get = name => sessionStorage.getItem(key + name);
const put = (name, value) => sessionStorage.setItem(key + name, value);
const remove = name => sessionStorage.removeItem(key + name);

function clearFlow() {
    ['code', 'verifier', 'state', 'created'].forEach(remove);
}

function encode(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function random(size) {
    return encode(crypto.getRandomValues(new Uint8Array(size)));
}

export default function AuthLab() {
    const [status, setStatus] = useState('No autenticado');
    const [output, setOutput] = useState('Esperando autenticación...');
    const [tokens, setTokens] = useState(null);
    const [hasCode, setHasCode] = useState(false);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const show = value => setOutput(typeof value === 'string' ? value : JSON.stringify(value, null, 2));

    useEffect(() => {
        try {
            const saved = get('tokens');

            if (saved) {
                setTokens(JSON.parse(saved));
                setStatus('Tokens disponibles; consulta el perfil para comprobar la sesión');
            }

            const params = new URLSearchParams(window.location.search);

            if (params.has('code') || params.has('error')) {
                const valid = params.get('state')
                    && params.get('state') === get('state')
                    && get('verifier')
                    && Date.now() - Number(get('created')) < 600000;

                window.history.replaceState({}, '', window.location.pathname);

                if (!valid) {
                    clearFlow();
                    throw new Error('Respuesta rechazada: state inválido o intento de inicio expirado. Inicia sesión nuevamente.');
                }

                if (params.has('error')) {
                    clearFlow();
                    throw new Error(`${params.get('error')}: ${params.get('error_description') || ''}`);
                }

                put('code', params.get('code'));
                remove('state');
                setHasCode(true);
                setStatus('Código recibido y state validado');
                show('Pulsa «Intercambiar código». El código tiene una vigencia corta y solo puede usarse una vez.');
            } else {
                setHasCode(Boolean(get('code')));
            }
        } catch (error) {
            setStatus('Error de autenticación');
            show(error.message);
        }
    }, []);

    async function run(action) {
        if (lock.current) return;

        lock.current = true;
        setBusy(true);

        try {
            await action();
        } catch (error) {
            setStatus('Error');
            show(`${error.message}\n\nSi falla la conexión, verifica Keycloak y Web Origins (http://localhost:3000).`);
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    async function login() {
        if (!crypto.subtle) throw new Error('PKCE necesita localhost o HTTPS.');

        clearFlow();
        setHasCode(false);

        const verifier = random(64), state = random(32);
        const challenge = encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));

        put('verifier', verifier);
        put('state', state);
        put('created', String(Date.now()));

        const params = new URLSearchParams({
            client_id: config.clientId,
            response_type: 'code',
            redirect_uri: config.redirect,
            scope: config.scope,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            state
        });
        window.location.assign(`${endpoint}/auth?${params}`);
    }

    async function requestToken(values) {
        const response = await fetch(`${endpoint}/token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({client_id: config.clientId, ...values}),
            cache: 'no-store'
        });

        const raw = await response.text();
        let body;

        try {
            body = JSON.parse(raw);
        } catch {
            throw new Error(`HTTP ${response.status}: respuesta no JSON`);
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.error_description || body.error || raw}`);
        if (!body.access_token) throw new Error('La respuesta no contiene access_token.');

        put('tokens', JSON.stringify(body));
        setTokens(body);
        setStatus('Tokens recibidos correctamente');
        show(body);
    }

    async function exchange() {
        const code = get('code'), verifier = get('verifier');

        if (!code || !verifier) throw new Error('Primero inicia sesión.');

        // Retirar antes del envío evita reutilizar un código incluso si se pierde la respuesta.
        clearFlow();
        setHasCode(false);

        await requestToken({
            grant_type: 'authorization_code',
            code,
            code_verifier: verifier,
            redirect_uri: config.redirect
        });
    }

    async function profile() {
        const response = await fetch(`${endpoint}/userinfo`, {
            headers: {Authorization: `Bearer ${tokens.access_token}`},
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`Perfil: HTTP ${response.status}. Renueva el token o inicia sesión.`);

        show(await response.json());
        setStatus('Perfil consultado correctamente');
    }

    function logout() {
        const params = new URLSearchParams({
            client_id: config.clientId,
            post_logout_redirect_uri: config.logoutRedirect
        });

        if (tokens?.id_token) params.set('id_token_hint', tokens.id_token);

        clearFlow();
        remove('tokens');
        setTokens(null);
        setHasCode(false);

        window.location.assign(`${endpoint}/logout?${params}`);
    }

    return <main className="card">
        <span className="eyebrow">Laboratorio OAuth2.0</span>
        <h1>Keycloak Authorization Code + PKCE</h1>
        <p>Prueba el inicio de sesión, el intercambio de código y la sesión OIDC.</p>
        <dl>
            {[['Servidor', config.url], ['Realm', config.realm], ['Cliente público', config.clientId], ['Callback', config.redirect]].map(([label, value]) =>
                <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            )}
        </dl>
        <div className="actions">
            <button className="login" disabled={busy} onClick={() => run(login)}>Iniciar sesión</button>
            <button disabled={busy || !hasCode} onClick={() => run(exchange)}>Intercambiar código</button>
            <button disabled={busy || !tokens} onClick={() => run(profile)}>Consultar perfil</button>
            <button disabled={busy || !tokens?.refresh_token} onClick={() => run(() => requestToken({
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh_token
            }))}>Renovar token
            </button>
            <button className="logout" disabled={busy} onClick={() => run(logout)}>Cerrar sesión</button>
        </div>
        <div className="status" role="status" aria-live="polite">{busy ? 'Procesando…' : status}</div>
        <h2>Resultado</h2>
        <p className="note">Laboratorio local: los tokens se muestran para inspección y se guardan en <strong>sessionStorage</strong> de esta pestaña. (not share screen with tokes)</p>
        <pre>{output}</pre>
    </main>;
}
