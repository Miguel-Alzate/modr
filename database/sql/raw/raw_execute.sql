-- Configurar codificación del cliente
\encoding UTF8

-- Ejecutar scripts en orden
\i raw_create_database.sql
\c modr_monitoring
\i raw_create_functions.sql
\i raw_create_tables.sql
\i raw_create_indexes.sql
\i raw_create_triggers.sql
\i raw_insert_initial_data.sql
