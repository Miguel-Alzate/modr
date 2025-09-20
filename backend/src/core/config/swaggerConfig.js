const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MODR API Documentation',
            version: '1.0.0',
            description: 'MODR monitoring system API documentation with comprehensive request tracking and statistics',
            contact: {
                name: 'MODR Support',
                email: 'support@modr.com'
            }
        },
        servers: [
            {
                url: process.env.API_URL,
                description: 'MODR API Server'
            },
        ],
        components: {
            schemas: {
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Indicates if the operation was successful'
                        },
                        message: {
                            type: 'string',
                            description: 'Human-readable message describing the result'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            description: 'ISO timestamp of when the response was generated'
                        }
                    }
                },
                
                ApiError: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'string',
                            description: 'Error type identifier',
                            enum: ['VALIDATION_ERROR', 'NOT_FOUND', 'DATABASE_ERROR', 'INTERNAL_ERROR', 'TIMEOUT_ERROR']
                        },
                        message: {
                            type: 'string',
                            description: 'Human-readable error message'
                        },
                        details: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Additional error details (for validation errors)'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time'
                        },
                        httpCode: {
                            type: 'integer',
                            description: 'HTTP status code'
                        }
                    }
                },
                
                Pagination: {
                    type: 'object',
                    properties: {
                        current_page: {
                            type: 'integer',
                            description: 'Current page number'
                        },
                        per_page: {
                            type: 'integer',
                            description: 'Number of items per page'
                        },
                        total: {
                            type: 'integer',
                            description: 'Total number of items'
                        },
                        total_pages: {
                            type: 'integer',
                            description: 'Total number of pages'
                        },
                        has_next: {
                            type: 'boolean',
                            description: 'Whether there is a next page'
                        },
                        has_prev: {
                            type: 'boolean',
                            description: 'Whether there is a previous page'
                        }
                    }
                },

                RequestObject: {
                    type: 'object',
                    properties: {
                        request_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Unique identifier for the request'
                        },
                        path: {
                            type: 'string',
                            description: 'Request path/endpoint'
                        },
                        controller: {
                            type: 'string',
                            description: 'Controller that handled the request'
                        },
                        happened: {
                            type: 'string',
                            format: 'date-time',
                            description: 'When the request occurred'
                        },
                        duration: {
                            type: 'integer',
                            description: 'Duration in milliseconds'
                        },
                        made_by: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User ID who made the request'
                        },
                        status: {
                            type: 'object',
                            properties: {
                                code: {
                                    type: 'integer',
                                    description: 'HTTP status code'
                                },
                                description: {
                                    type: 'string',
                                    description: 'HTTP status description'
                                }
                            }
                        },
                        method: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
                                    description: 'HTTP method'
                                }
                            }
                        },
                        user: {
                            type: 'object',
                            nullable: true,
                            description: 'User information if available'
                        }
                    }
                }
            },
            
            parameters: {
                PageParam: {
                    in: 'query',
                    name: 'page',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1
                    },
                    description: 'Page number for pagination'
                },
                LimitParam: {
                    in: 'query',
                    name: 'limit',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 50
                    },
                    description: 'Number of items per page (max 100)'
                },
                DaysParam: {
                    in: 'query',
                    name: 'days',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 365,
                        default: 7
                    },
                    description: 'Number of days for the operation'
                }
            },

            responses: {
                ValidationError: {
                    description: 'Validation error in request parameters',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ApiError'
                            },
                            example: {
                                success: false,
                                error: "VALIDATION_ERROR",
                                message: "Request validation failed",
                                details: ["Page must be a positive integer greater than 0"],
                                timestamp: "2024-01-15T10:30:00.000Z",
                                httpCode: 400
                            }
                        }
                    }
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ApiError'
                            },
                            example: {
                                success: false,
                                error: "NOT_FOUND",
                                message: "Resource not found",
                                timestamp: "2024-01-15T10:30:00.000Z",
                                httpCode: 404
                            }
                        }
                    }
                },
                InternalError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ApiError'
                            },
                            example: {
                                success: false,
                                error: "INTERNAL_ERROR",
                                message: "Internal server error",
                                timestamp: "2024-01-15T10:30:00.000Z",
                                httpCode: 500
                            }
                        }
                    }
                }
            }
        },
        
        tags: [
            {
                name: 'CleanUp',
                description: 'Operations for cleaning up old monitoring data'
            },
            {
                name: 'Requests',
                description: 'Operations for retrieving and filtering request data'
            },
            {
                name: 'Stats',
                description: 'Operations for retrieving system statistics and metrics'
            }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/routes/**/*.js' // Para subcarpetas si las tienes
    ],
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app) {
    // Configurar Swagger UI con opciones personalizadas
    const swaggerOptions = {
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #2c3e50; }
        `,
        customSiteTitle: 'MODR API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true
        }
    };

    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
    
    // Endpoint para obtener el spec JSON raw
    app.get('/api/v1/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

module.exports = swaggerDocs;