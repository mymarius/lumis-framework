'use strict';

/**
 * Minimal OpenAPI mocker helper.
 *
 * TODO: implement full OpenAPI parsing + mock data generation.
 */

function mockFromOpenApi(openApiSpec, options = {}) {
  // Placeholder: Walk through the OpenAPI paths and generate responses for each operation.
  // Real implementation should support request/response schemas, security, and status codes.
  return {
    info: openApiSpec.info,
    paths: {},
  };
}

module.exports = { mockFromOpenApi };
