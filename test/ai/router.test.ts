import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../src/ai/prompts.js';

describe('classifyIntent', () => {
  it('classifies "why did checkout fail?" as error_analysis', () => {
    expect(classifyIntent('why did checkout fail?')).toBe('error_analysis');
  });

  it('classifies "what did user 4521 do?" as journey_replay', () => {
    expect(classifyIntent('what did user 4521 do?')).toBe('journey_replay');
  });

  it('classifies "is my app healthy?" as health_check', () => {
    expect(classifyIntent('is my app healthy?')).toBe('health_check');
  });

  it('classifies "show recent logs" as general_query', () => {
    expect(classifyIntent('show recent logs')).toBe('general_query');
  });

  it('returns general_query for empty question', () => {
    expect(classifyIntent('')).toBe('general_query');
  });

  it('classifies error-related keywords correctly', () => {
    expect(classifyIntent('what error happened at 3pm?')).toBe('error_analysis');
    expect(classifyIntent('why is the payment crashing?')).toBe('error_analysis');
    expect(classifyIntent('show me the stack trace')).toBe('error_analysis');
  });

  it('classifies journey-related keywords correctly', () => {
    expect(classifyIntent('show user journey for customer 99')).toBe('journey_replay');
    expect(classifyIntent('replay session abc-123')).toBe('journey_replay');
  });

  it('classifies health-related keywords correctly', () => {
    expect(classifyIntent('give me a status overview')).toBe('health_check');
    expect(classifyIntent('is the server running?')).toBe('health_check');
  });
});
