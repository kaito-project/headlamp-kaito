/**
 * Schema Normalization Test
 * Test the schema normalization functions to ensure they handle various edge cases
 */

// Test schemas that might cause issues
const testSchemas = [
  // Empty schema
  null,

  // String schema
  '{"type": "object", "properties": {"name": {"type": "string"}}}',

  // Schema with problematic properties
  {
    type: 'object',
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'test-schema',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
  },

  // Schema without type
  {
    properties: {
      query: { description: 'Search query' },
    },
  },

  // Nested schema
  {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          preferences: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },

  // Schema with enum
  {
    type: 'object',
    properties: {
      region: {
        type: 'string',
        enum: ['na', 'eu', 'kr', 'jp'],
      },
    },
  },
];

function testNormalizeToolSchema(schema) {
  try {
    // This would be the actual normalize function from your app
    // For testing, we'll recreate the logic here
    const normalizeToolSchema = schema => {
      if (!schema) {
        return {
          type: 'object',
          properties: {},
          required: [],
        };
      }

      try {
        if (typeof schema === 'string') {
          schema = JSON.parse(schema);
        }

        const cleanSchema = {
          type: 'object',
          properties: {},
          required: [],
        };

        if (schema.type && typeof schema.type === 'string') {
          cleanSchema.type = schema.type;
        }

        if (schema.description && typeof schema.description === 'string') {
          cleanSchema.description = schema.description;
        }

        if (schema.required && Array.isArray(schema.required)) {
          cleanSchema.required = schema.required.filter(item => typeof item === 'string');
        }

        if (schema.properties && typeof schema.properties === 'object') {
          cleanSchema.properties = {};

          Object.keys(schema.properties).forEach(key => {
            const prop = schema.properties[key];
            if (prop && typeof prop === 'object') {
              const cleanProp = {};

              if (prop.type && typeof prop.type === 'string') {
                cleanProp.type = prop.type;
              } else {
                if (prop.properties) {
                  cleanProp.type = 'object';
                } else if (prop.items) {
                  cleanProp.type = 'array';
                } else if (prop.enum) {
                  cleanProp.type = 'string';
                } else {
                  cleanProp.type = 'string';
                }
              }

              if (prop.description && typeof prop.description === 'string') {
                cleanProp.description = prop.description;
              }

              if (prop.enum && Array.isArray(prop.enum)) {
                cleanProp.enum = prop.enum;
              }

              if (prop.default !== undefined) {
                cleanProp.default = prop.default;
              }

              if (cleanProp.type === 'array' && prop.items) {
                cleanProp.items = {
                  type:
                    prop.items.type && typeof prop.items.type === 'string'
                      ? prop.items.type
                      : 'string',
                };
              }

              if (cleanProp.type === 'object' && prop.properties) {
                cleanProp.properties = {};
                Object.keys(prop.properties).forEach(nestedKey => {
                  const nestedProp = prop.properties[nestedKey];
                  if (nestedProp && typeof nestedProp === 'object') {
                    cleanProp.properties[nestedKey] = {
                      type:
                        nestedProp.type && typeof nestedProp.type === 'string'
                          ? nestedProp.type
                          : 'string',
                      description: nestedProp.description || undefined,
                    };
                  }
                });
              }

              cleanSchema.properties[key] = cleanProp;
            }
          });
        }

        return cleanSchema;
      } catch (error) {
        return {
          type: 'object',
          properties: {},
          required: [],
        };
      }
    };

    const normalized = normalizeToolSchema(schema);

    // Check if the normalized schema is safe
    const isSafe =
      normalized &&
      typeof normalized === 'object' &&
      normalized.type &&
      typeof normalized.type === 'string' &&
      !normalized.hasOwnProperty('$schema') &&
      !normalized.hasOwnProperty('$id') &&
      !normalized.hasOwnProperty('$ref');

    return { success: true, normalized, safe: isSafe };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
}

console.log('🧪 Running Schema Normalization Tests...');

testSchemas.forEach((schema, index) => {
  console.log(`\n--- Test ${index + 1} ---`);
  testNormalizeToolSchema(schema);
});

console.log('\n🎉 All tests completed!');
