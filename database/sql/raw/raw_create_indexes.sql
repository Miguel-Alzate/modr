-- =============================================
-- Crear índices para optimización de consultas
-- =============================================

-- Índices para tabla requests (la más consultada)
CREATE INDEX idx_requests_happened ON requests(happened);
CREATE INDEX idx_requests_status_happened ON requests(status_id, happened);
CREATE INDEX idx_requests_user_happened ON requests(made_by, happened);
CREATE INDEX idx_requests_path ON requests(path);
CREATE INDEX idx_requests_controller ON requests(controller);
CREATE INDEX idx_requests_duration ON requests(duration);
CREATE INDEX idx_requests_composite ON requests(status_id, method_id, happened);

-- Índices para tabla queries
CREATE INDEX idx_queries_request_id ON queries(request_id);
CREATE INDEX idx_queries_duration ON queries(duration);
CREATE INDEX idx_queries_executed_at ON queries(executed_at);
CREATE INDEX idx_queries_request_executed ON queries(request_id, executed_at);

-- Índices para tabla exceptions
CREATE INDEX idx_exceptions_request_id ON exceptions(request_id);
CREATE INDEX idx_exceptions_occurred_at ON exceptions(occurred_at);
CREATE INDEX idx_exceptions_type ON exceptions(type);

-- Índices para tabla users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role_id ON users(role_id);

-- Índices para tabla request_headers
CREATE INDEX idx_request_headers_request_id ON request_headers(request_id);
CREATE INDEX idx_request_headers_header_id ON request_headers(header_id);

-- Índices para optimizar búsquedas de texto
CREATE INDEX idx_requests_path_trgm ON requests USING gin(path gin_trgm_ops);
CREATE INDEX idx_requests_controller_trgm ON requests USING gin(controller gin_trgm_ops);
CREATE INDEX idx_queries_sql_trgm ON queries USING gin(sql gin_trgm_ops);