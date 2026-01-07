import { describe, it, expect } from 'vitest'
import {
  convertToolsForClaude,
  convertToolsForOpenAI
} from '../../src/api/handlers/tools.js'

// Mock de tool definitions simples para teste
const mockToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'test_function',
      description: 'A test function',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'First parameter'
          }
        },
        required: ['param1']
      }
    }
  }
]

describe('Tool Handlers', () => {
  describe('convertToolsForClaude', () => {
    it('should convert OpenAI format to Claude format', () => {
      const claudeTools = convertToolsForClaude(mockToolDefinitions)

      expect(claudeTools).toHaveLength(1)
      expect(claudeTools[0]).toHaveProperty('name')
      expect(claudeTools[0]).toHaveProperty('description')
      expect(claudeTools[0]).toHaveProperty('input_schema')

      // Claude usa input_schema em vez de parameters
      expect(claudeTools[0].input_schema).toEqual(mockToolDefinitions[0].function.parameters)
    })

    it('should preserve tool name and description', () => {
      const claudeTools = convertToolsForClaude(mockToolDefinitions)

      expect(claudeTools[0].name).toBe('test_function')
      expect(claudeTools[0].description).toBe('A test function')
    })

    it('should handle empty array', () => {
      const claudeTools = convertToolsForClaude([])
      expect(claudeTools).toHaveLength(0)
    })
  })

  describe('convertToolsForOpenAI', () => {
    it('should convert to OpenAI format structure', () => {
      const openaiTools = convertToolsForOpenAI(mockToolDefinitions)

      expect(openaiTools).toHaveLength(1)
      expect(openaiTools[0]).toHaveProperty('type', 'function')
      expect(openaiTools[0]).toHaveProperty('function')
    })

    it('should handle empty array', () => {
      const openaiTools = convertToolsForOpenAI([])
      expect(openaiTools).toHaveLength(0)
    })
  })
})
