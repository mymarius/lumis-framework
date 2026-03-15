'use strict';

/**
 * Minimal GraphQL mock API helper.
 *
 * TODO: hook into graphql-js and generate resolvers based on schema definitions.
 */

function mockFromGraphqlSchema(schema, options = {}) {
  return {
    schema,
    mocks: {},
  };
}

module.exports = { mockFromGraphqlSchema };
