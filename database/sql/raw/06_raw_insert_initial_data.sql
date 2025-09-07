-- =============================================
-- Insertar datos iniciales
-- =============================================

-- Insertar roles básicos
INSERT INTO roles (name, description) VALUES
('admin', 'Administrador del sistema'),
('user', 'Usuario regular'),
('guest', 'Usuario invitado'),
('developer', 'Desarrollador/Programador');

-- Insertar códigos de estado HTTP más comunes
INSERT INTO status (code, description) VALUES
-- 2xx Success
(200, 'OK - Solicitud exitosa'),
(201, 'Created - Recurso creado exitosamente'),
(204, 'No Content - Solicitud exitosa sin contenido'),
-- 3xx Redirection  
(301, 'Moved Permanently - Recurso movido permanentemente'),
(302, 'Found - Recurso encontrado en otra ubicación'),
(304, 'Not Modified - Recurso no modificado'),
-- 4xx Client Error
(400, 'Bad Request - Solicitud malformada'),
(401, 'Unauthorized - No autorizado'),
(403, 'Forbidden - Acceso prohibido'),
(404, 'Not Found - Recurso no encontrado'),
(405, 'Method Not Allowed - Método no permitido'),
(422, 'Unprocessable Entity - Entidad no procesable'),
(429, 'Too Many Requests - Demasiadas solicitudes'),
-- 5xx Server Error
(500, 'Internal Server Error - Error interno del servidor'),
(502, 'Bad Gateway - Gateway incorrecto'),
(503, 'Service Unavailable - Servicio no disponible'),
(504, 'Gateway Timeout - Timeout del gateway');

-- Insertar métodos HTTP
INSERT INTO methods (name, description) VALUES
('GET', 'Obtener recurso'),
('POST', 'Crear nuevo recurso'),
('PUT', 'Actualizar recurso completo'),
('PATCH', 'Actualizar recurso parcialmente'),
('DELETE', 'Eliminar recurso'),
('HEAD', 'Obtener headers del recurso'),
('OPTIONS', 'Obtener métodos permitidos');

-- Insertar headers más comunes
INSERT INTO headers (name, description) VALUES
('Content-Type', 'Tipo de contenido de la solicitud'),
('Authorization', 'Token o credenciales de autorización'),
('Accept', 'Tipos de contenido aceptados'),
('User-Agent', 'Información del cliente que realiza la solicitud'),
('X-Forwarded-For', 'IP original del cliente (proxy)'),
('Origin', 'Origen de la solicitud'),
('Referer', 'URL de la página que originó la solicitud'),
('Cache-Control', 'Directivas de cache'),
('Content-Length', 'Longitud del contenido en bytes'),
('Host', 'Nombre del servidor de destino'),
('X-Requested-With', 'Indica si es una solicitud AJAX'),
('Accept-Language', 'Idiomas preferidos del cliente'),
('Accept-Encoding', 'Codificaciones aceptadas'),
('Connection', 'Opciones de conexión'),
('X-CSRF-Token', 'Token de protección CSRF');

-- Crear usuario de sistema para operaciones automáticas
INSERT INTO users (user_id, first_name, last_name, email, status, role_id) 
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'Monitor',
    'system@modr.local',
    1,
    (SELECT role_id FROM roles WHERE name = 'admin')
);

-- =============================================
-- Comentarios para documentación
-- =============================================

-- Comentarios en las tablas principales
COMMENT ON TABLE requests IS 'Tabla principal que almacena información de todas las solicitudes HTTP';
COMMENT ON TABLE queries IS 'Almacena todas las consultas SQL ejecutadas por cada request';
COMMENT ON TABLE exceptions IS 'Registra errores y excepciones ocurridas durante el procesamiento';
COMMENT ON TABLE responses IS 'Contiene las respuestas devueltas por el servidor';
COMMENT ON TABLE payloads IS 'Almacena los datos enviados en las solicitudes';

-- Comentarios en campos importantes
COMMENT ON COLUMN requests.duration IS 'Duración total de la request en milisegundos';
COMMENT ON COLUMN requests.happened IS 'Timestamp exacto cuando ocurrió la solicitud';
COMMENT ON COLUMN queries.duration IS 'Tiempo de ejecución de la query en milisegundos';
COMMENT ON COLUMN responses.size IS 'Tamaño de la respuesta en kilobytes';
COMMENT ON COLUMN exceptions.type IS 'Tipo de excepción: business, validation, system';

-- =============================================
-- Verificación de la instalación
-- =============================================

-- Consulta para verificar que todo se creó correctamente
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;