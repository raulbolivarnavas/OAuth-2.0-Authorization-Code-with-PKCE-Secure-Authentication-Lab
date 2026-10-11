# **Laboratorio de autenticación segura OAuth 2.0 Authorization Code con PKCE** 

**PKCE** significa *Proof Key for Code Exchange*. Es una protección adicional del flujo de inicio de sesión **OAuth 2.0 / OpenID Connect**, que evita que alguien use un código de autorización que haya interceptado.

Funciona así:

1. Tu aplicación genera un valor aleatorio: **`code_verifier`**.
2. Calcula su huella SHA-256: **`code_challenge`**, y la envía al iniciar el login.
3. El usuario se autentica, por ejemplo, en **Keycloak**, que devuelve un código de autorización.
4. Tu aplicación envía ese código junto con el **`code_verifier`** para solicitar los tokens.
5. Keycloak comprueba que el verificador corresponde al desafío inicial y entrega los tokens.

**Si alguien roba el código de autorización, no podrá canjearlo sin el `code_verifier`.**

Una precisión importante: **PKCE no autentica al usuario ni sustituye la autenticación de un cliente mediante `client_secret`**. Protege el intercambio del código. Una aplicación pública puede usar PKCE sin tener un secreto; una aplicación con backend puede usar PKCE además de autenticarse con un secreto.

**Para una aplicación React:** si el navegador realiza directamente el flujo, utiliza un cliente público con PKCE y método **`S256`**, sin exponer ningún `client_secret`. Si el backend realiza el intercambio, puede utilizar un cliente confidencial con secreto y PKCE.

---

:::mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant A as Aplicación
    participant K as Keycloak

    U->>A: Pulsar «Iniciar sesión»
    A->>A: Generar code_verifier aleatorio y state
    A->>A: Calcular code_challenge con SHA-256
    A->>A: Guardar temporalmente code_verifier y state
    A-->>U: Redirigir a Keycloak
    U->>K: Solicitar autorización con code_challenge, S256 y state
    K-->>U: Mostrar formulario de acceso
    U->>K: Enviar credenciales
    K->>K: Validar credenciales
    K-->>U: Redirigir al callback con code y state
    U->>A: Abrir callback con code y state
    A->>A: Validar state recibido

    alt State válido
        A->>K: Solicitar tokens con code y code_verifier
        K->>K: Validar código y comprobar desafío PKCE
        alt Código y verificador válidos
            K-->>A: Entregar tokens
            A-->>U: Mostrar sesión iniciada
        else Intercambio inválido
            K-->>A: Rechazar solicitud
            A-->>U: Mostrar error
        end
    else State inválido
        A-->>U: Rechazar callback
    end
:::

---

### Author: [Raul Bolivar Navas](https://github.com/raulrobinson)

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
