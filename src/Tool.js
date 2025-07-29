import { z } from 'zod'

/**
 * Classe base per definire un tool compatibile con @openai/agents
 */
export class Tool {
  constructor(options) {
    this.name = options.name
    this.description = options.description
    this.parameters = options.parameters
    this.handler = options.handler
    
    // Supporto per schema Zod (opzionale)
    if (options.schema) {
      this.schema = options.schema
      this.parameters = this.zodToJsonSchema(options.schema)
    }
  }

  /**
   * Converte uno schema Zod in JSON Schema per OpenAI
   */
  zodToJsonSchema(schema) {
    // Implementazione semplificata per gli schemi di base
    if (schema._def.typeName === 'ZodObject') {
      const properties = {}
      const required = []
      
      for (const [key, value] of Object.entries(schema.shape)) {
        if (value._def.typeName === 'ZodString') {
          properties[key] = { 
            type: 'string', 
            description: value._def.description || `${key} parameter`
          }
        } else if (value._def.typeName === 'ZodNumber') {
          properties[key] = { 
            type: 'number', 
            description: value._def.description || `${key} parameter`
          }
        }
        
        if (!value.isOptional()) {
          required.push(key)
        }
      }
      
      return {
        type: 'object',
        properties,
        required
      }
    }
    
    return this.parameters
  }

  /**
   * Restituisce la definizione del tool per OpenAI (compatibile con @openai/agents)
   */
  getDefinition() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters
      }
    }
  }

  /**
   * Esegue il tool con gli argomenti forniti
   */
  async execute(args, session) {
    // Validazione con schema Zod se disponibile
    if (this.schema) {
      try {
        const validatedArgs = this.schema.parse(args)

        return await this.handler(validatedArgs, session)
      } catch (error) {
        throw new Error(`Validation error: ${error.message}`)
      }
    }
    
    return await this.handler(args, session)
  }

  /**
   * Alias per compatibilità con @openai/agents
   */
  async run(args, session) {
    return await this.execute(args, session)
  }
}
