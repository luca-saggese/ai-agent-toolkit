/**
 * AI Agent Toolkit - Main Entry Point
 * 
 * A powerful AI agent toolkit compatible with @openai/agents
 * for building conversational AI with tool calling support.
 * 
 * @example
 * ```javascript
 * import { Agent, Tool } from '@yourname/ai-agent-toolkit'
 * 
 * // Create a simple tool
 * const weatherTool = new Tool({
 *   name: 'get_weather',
 *   description: 'Get weather information for a city',
 *   schema: z.object({
 *     city: z.string().describe('City name')
 *   }),
 *   handler: async ({ city }) => `Weather in ${city}: 25°C, sunny`
 * })
 * 
 * // Create an agent
 * const agent = new Agent({
 *   model: 'gpt-4',
 *   apiKey: process.env.OPENAI_API_KEY,
 *   instructions: 'You are a helpful weather assistant.',
 *   tools: [weatherTool]
 * })
 * 
 * // Use the agent
 * const response = await agent.run('What\'s the weather in Rome?')
 * console.log(response.content)
 * ```
 */

// Core exports
export { Agent } from './Agent.js'
export { Tool } from './Tool.js'

// Utility functions
export { createChatInterface } from './cli.js'

export { parseJSON, checkAndCompressHistory } from './lib/utils.js'
export { callAI } from './lib/ai-client.js'

/**
 * Quick setup function for common use cases
 */
export function createAgent(options) {
  return new Agent(options)
}

/**
 * Quick tool creation function
 */
export function createTool(options) {
  return new Tool(options)
}

/**
 * Version information
 */
export const version = '1.0.0'
