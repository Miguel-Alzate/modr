-- =============================================
-- Crear base de datos para sistema de monitoreo
-- =============================================

-- Configurar codificación del cliente
SET client_encoding = 'UTF8';

-- Crear la base de datos (ejecutar como superusuario)
CREATE DATABASE modr_monitoring
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Spanish_Spain.1252'
    LC_CTYPE = 'Spanish_Spain.1252'
    TABLESPACE = pg_default
    TEMPLATE template0
    CONNECTION LIMIT = -1;

-- Conectar a la base de datos
\c modr_monitoring;

-- Establecer codificación para la sesión actual
SET client_encoding = 'UTF8';

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";