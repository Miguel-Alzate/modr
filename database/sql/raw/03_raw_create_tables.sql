-- =============================================
-- Crear tablas del sistema de monitoreo
-- =============================================

-- Tabla: roles
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    status SMALLINT DEFAULT 1 CHECK (status IN (0, 1)),
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: status
CREATE TABLE status (
    status_id SERIAL PRIMARY KEY,
    code SMALLINT NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: methods
CREATE TABLE methods (
    method_id SERIAL PRIMARY KEY,
    name VARCHAR(10) NOT NULL UNIQUE, -- GET, POST, PUT, DELETE, etc.
    description VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: headers
CREATE TABLE headers (
    header_id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE, -- Content-Type, Authorization, etc.
    description VARCHAR(100),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payloads
CREATE TABLE payloads (
    payload_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payload_json JSON,
    sent_from VARCHAR(255), -- IP o identificador del origen desde el frontend
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: responses
CREATE TABLE responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content JSON,
    size FLOAT, -- Tamaño de la respuesta en KB
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: requests (tabla principal)
CREATE TABLE requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status_id INTEGER NOT NULL REFERENCES status(status_id) ON DELETE RESTRICT,
    method_id INTEGER NOT NULL REFERENCES methods(method_id) ON DELETE RESTRICT,
    payload_id UUID REFERENCES payloads(payload_id) ON DELETE SET NULL,
    response_id UUID REFERENCES responses(response_id) ON DELETE SET NULL,
    path VARCHAR(255) NOT NULL,
    controller VARCHAR(255) NOT NULL,
    happened TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration FLOAT, -- Duración en milisegundos
    made_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: request_headers (relación muchos a muchos)
CREATE TABLE request_headers (
    request_id UUID NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
    header_id INTEGER NOT NULL REFERENCES headers(header_id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, header_id)
);

-- Tabla: queries
CREATE TABLE queries (
    query_id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
    sql TEXT NOT NULL,
    duration FLOAT NOT NULL, -- Duración en milisegundos
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: exceptions
CREATE TABLE exceptions (
    exception_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(request_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(100), -- Tipo de excepción: 'business', 'validation', 'system'
    stack_trace TEXT, -- Opcional, para errores técnicos
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);