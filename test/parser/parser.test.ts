import { describe, it, expect } from 'vitest';
import { parseJsonLog } from '../../src/parser/json.js';
import { parseExpressLog } from '../../src/parser/frameworks/express.js';
import { parseFastApiLog } from '../../src/parser/frameworks/fastapi.js';
import { parseDjangoLog } from '../../src/parser/frameworks/django.js';
import { parseRailsLog } from '../../src/parser/frameworks/rails.js';
import { parseLine, parseMultiLine } from '../../src/parser/index.js';
import {
  extractTimestamp,
  extractLevel,
  extractHttpInfo,
  extractUserId,
  extractDbQuery,
  extractExternalCall,
  isStackTraceLine,
} from '../../src/parser/patterns.js';

describe('patterns', () => {
  describe('extractTimestamp', () => {
    it('should extract ISO 8601 timestamps', () => {
      const ts = extractTimestamp('2024-01-15T10:30:00.000Z some message');
      expect(ts).toBeInstanceOf(Date);
      expect(ts!.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should extract simple datetime', () => {
      const ts = extractTimestamp('2024-01-15 10:30:00 INFO starting');
      expect(ts).toBeInstanceOf(Date);
      expect(ts!.getFullYear()).toBe(2024);
    });

    it('should return null for no timestamp', () => {
      expect(extractTimestamp('just a plain message')).toBeNull();
    });
  });

  describe('extractLevel', () => {
    it('should extract DEBUG level', () => {
      expect(extractLevel('DEBUG: something')).toBe('DEBUG');
    });

    it('should extract INFO level', () => {
      expect(extractLevel('[INFO] server started')).toBe('INFO');
    });

    it('should map WARNING to WARN', () => {
      expect(extractLevel('WARNING: deprecated')).toBe('WARN');
    });

    it('should map CRITICAL to FATAL', () => {
      expect(extractLevel('CRITICAL: system down')).toBe('FATAL');
    });

    it('should return null when no level found', () => {
      expect(extractLevel('just text')).toBeNull();
    });
  });

  describe('extractHttpInfo', () => {
    it('should extract HTTP method, path, status', () => {
      const info = extractHttpInfo('GET /api/users 200 15.3 ms');
      expect(info).toEqual({
        method: 'GET',
        path: '/api/users',
        status: 200,
        duration_ms: 15.3,
      });
    });

    it('should handle missing duration', () => {
      const info = extractHttpInfo('POST /api/data 201');
      expect(info).toEqual({
        method: 'POST',
        path: '/api/data',
        status: 201,
        duration_ms: null,
      });
    });

    it('should return null for non-HTTP lines', () => {
      expect(extractHttpInfo('just a log message')).toBeNull();
    });
  });

  describe('extractUserId', () => {
    it('should extract userId from JSON-like content', () => {
      expect(extractUserId('"userId": "user-123"')).toBe('user-123');
    });

    it('should extract user_id format', () => {
      expect(extractUserId('"user_id": "abc-456"')).toBe('abc-456');
    });

    it('should extract x-user-id header', () => {
      expect(extractUserId('x-user-id: usr_789')).toBe('usr_789');
    });

    it('should extract JWT sub claim', () => {
      expect(extractUserId('"sub": "auth0|12345"')).toBe('auth0|12345');
    });

    it('should return null when no user ID found', () => {
      expect(extractUserId('no user here')).toBeNull();
    });
  });

  describe('extractDbQuery', () => {
    it('should extract SELECT queries', () => {
      const query = extractDbQuery('SELECT * FROM users WHERE id = 1');
      expect(query).toContain('SELECT');
    });

    it('should extract INSERT queries', () => {
      const query = extractDbQuery('INSERT INTO logs (message) VALUES ("test")');
      expect(query).toContain('INSERT INTO');
    });

    it('should return null for non-SQL lines', () => {
      expect(extractDbQuery('just a message')).toBeNull();
    });
  });

  describe('extractExternalCall', () => {
    it('should detect Stripe API calls', () => {
      const call = extractExternalCall('calling https://api.stripe.com/v1/charges');
      expect(call).toContain('stripe.com');
    });

    it('should detect Twilio API calls', () => {
      const call = extractExternalCall('sending via https://api.twilio.com/messages');
      expect(call).toContain('twilio.com');
    });

    it('should return null for internal URLs', () => {
      expect(extractExternalCall('calling http://localhost:3000/api')).toBeNull();
    });
  });

  describe('isStackTraceLine', () => {
    it('should detect "at" lines', () => {
      expect(isStackTraceLine('    at Object.<anonymous> (/app/index.js:10:5)')).toBe(true);
    });

    it('should detect Python File lines', () => {
      expect(isStackTraceLine('  File "/app/main.py", line 10, in main')).toBe(true);
    });

    it('should detect Traceback header', () => {
      expect(isStackTraceLine('Traceback (most recent call last):')).toBe(true);
    });

    it('should not match regular lines', () => {
      expect(isStackTraceLine('INFO: server started')).toBe(false);
    });
  });
});

describe('JSON parser', () => {
  it('should parse standard JSON log with level and message', () => {
    const line = '{"level":"info","msg":"Server started","timestamp":"2024-01-15T10:30:00.000Z"}';
    const result = parseJsonLog(line, 'api');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('INFO');
    expect(result!.message).toBe('Server started');
    expect(result!.service).toBe('api');
    expect(result!.timestamp.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should parse JSON log with HTTP fields', () => {
    const line = '{"level":"info","message":"request completed","method":"GET","url":"/api/users","statusCode":200,"responseTime":45.2}';
    const result = parseJsonLog(line, 'web');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/api/users');
    expect(result!.status).toBe(200);
    expect(result!.duration_ms).toBe(45.2);
  });

  it('should parse JSON log with error object', () => {
    const line = '{"level":"error","msg":"failed","err":{"message":"connection refused","stack":"Error: connection refused\\n    at connect"}}';
    const result = parseJsonLog(line, 'api');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('ERROR');
    expect(result!.error_message).toBe('connection refused');
    expect(result!.stack_trace).toContain('Error: connection refused');
  });

  it('should parse JSON with user/session/request IDs', () => {
    const line = '{"level":"info","msg":"auth","userId":"u-123","sessionId":"s-456","requestId":"r-789"}';
    const result = parseJsonLog(line, 'auth');
    expect(result).not.toBeNull();
    expect(result!.user_id).toBe('u-123');
    expect(result!.session_id).toBe('s-456');
    expect(result!.request_id).toBe('r-789');
  });

  it('should parse pino/bunyan numeric levels', () => {
    const line = '{"level":50,"msg":"something broke","time":1705312200000}';
    const result = parseJsonLog(line, 'svc');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('ERROR');
  });

  it('should return null for non-JSON', () => {
    expect(parseJsonLog('not json at all', 'svc')).toBeNull();
  });

  it('should return null for arrays', () => {
    expect(parseJsonLog('[1,2,3]', 'svc')).toBeNull();
  });

  it('should generate unique IDs', () => {
    const line = '{"msg":"test"}';
    const a = parseJsonLog(line, 'svc');
    const b = parseJsonLog(line, 'svc');
    expect(a!.id).not.toBe(b!.id);
  });
});

describe('Express parser', () => {
  it('should parse morgan combined format', () => {
    const line = '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08"';
    const result = parseExpressLog(line, 'web');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/apache_pb.gif');
    expect(result!.status).toBe(200);
    expect(result!.user_id).toBe('frank');
    expect(result!.level).toBe('INFO');
  });

  it('should parse morgan dev format', () => {
    const line = 'GET /api/users 200 15.234 ms';
    const result = parseExpressLog(line, 'api');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/api/users');
    expect(result!.status).toBe(200);
    expect(result!.duration_ms).toBe(15.234);
  });

  it('should set ERROR level for 5xx status', () => {
    const line = 'POST /api/data 500 3.456 ms';
    const result = parseExpressLog(line, 'api');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('ERROR');
    expect(result!.error_message).toBe('HTTP 500');
  });

  it('should set WARN level for 4xx status', () => {
    const line = 'GET /api/missing 404 1.2 ms';
    const result = parseExpressLog(line, 'api');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('WARN');
  });

  it('should return null for non-express logs', () => {
    expect(parseExpressLog('just a random log line', 'api')).toBeNull();
  });
});

describe('FastAPI parser', () => {
  it('should parse uvicorn access log', () => {
    const line = 'INFO:     127.0.0.1:8000 - "GET /api/health HTTP/1.1" 200';
    const result = parseFastApiLog(line, 'fastapi');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/api/health');
    expect(result!.status).toBe(200);
    expect(result!.level).toBe('INFO');
  });

  it('should parse uvicorn with 500 status', () => {
    const line = 'INFO:     127.0.0.1:8000 - "POST /api/users HTTP/1.1" 500';
    const result = parseFastApiLog(line, 'fastapi');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
    expect(result!.error_message).toBe('HTTP 500');
  });

  it('should return null for non-uvicorn logs', () => {
    expect(parseFastApiLog('random text', 'svc')).toBeNull();
  });
});

describe('Django parser', () => {
  it('should parse Django dev server format', () => {
    const line = '[15/Jan/2024 10:30:00] "GET /admin/ HTTP/1.1" 200 1234';
    const result = parseDjangoLog(line, 'django');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/admin/');
    expect(result!.status).toBe(200);
  });

  it('should return null for non-django logs', () => {
    expect(parseDjangoLog('random text', 'svc')).toBeNull();
  });
});

describe('Rails parser', () => {
  it('should parse Rails Started line', () => {
    const line = 'I, [2024-01-15T10:30:00.000000 #12345]  INFO -- : Started GET "/users" for 127.0.0.1';
    const result = parseRailsLog(line, 'rails');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/users');
    expect(result!.level).toBe('INFO');
  });

  it('should parse Rails Completed line', () => {
    const line = 'I, [2024-01-15T10:30:00.000000 #12345]  INFO -- : Completed 200 OK in 15.3ms';
    const result = parseRailsLog(line, 'rails');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(200);
    expect(result!.duration_ms).toBe(15.3);
  });

  it('should parse simple Rails Started line', () => {
    const line = 'Started GET "/users" for 127.0.0.1';
    const result = parseRailsLog(line, 'rails');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/users');
  });

  it('should return null for non-rails logs', () => {
    expect(parseRailsLog('random text', 'svc')).toBeNull();
  });
});

describe('parseLine orchestrator', () => {
  it('should parse JSON logs first', () => {
    const line = '{"level":"info","msg":"hello","timestamp":"2024-01-15T10:30:00Z"}';
    const result = parseLine(line, 'api');
    expect(result.level).toBe('INFO');
    expect(result.message).toBe('hello');
  });

  it('should fallback to framework parser', () => {
    const line = 'GET /api/users 200 15.234 ms';
    const result = parseLine(line, 'web', 'express');
    expect(result.method).toBe('GET');
    expect(result.path).toBe('/api/users');
  });

  it('should fallback to pattern extraction for raw lines', () => {
    const line = '2024-01-15T10:30:00Z ERROR: Database connection lost';
    const result = parseLine(line, 'db');
    expect(result.level).toBe('ERROR');
    expect(result.timestamp.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    expect(result.raw).toBe(line);
  });

  it('should always return a ParsedLogEntry', () => {
    const result = parseLine('random garbage', 'svc');
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.service).toBe('svc');
    expect(result.raw).toBe('random garbage');
  });

  it('should detect errors in raw lines', () => {
    const result = parseLine('Error: something went wrong', 'svc');
    expect(result.level).toBe('ERROR');
    expect(result.error_message).not.toBeNull();
  });
});

describe('parseMultiLine', () => {
  it('should merge stack traces with parent error', () => {
    const lines = [
      'Error: Connection refused',
      '    at Socket.connect (net.js:943:16)',
      '    at Object.connect (http.js:159:13)',
      'INFO: Next request processed',
    ];
    const results = parseMultiLine(lines, 'api');
    expect(results.length).toBe(2);
    expect(results[0].stack_trace).toContain('Socket.connect');
    expect(results[0].stack_trace).toContain('Object.connect');
    expect(results[0].level).toBe('ERROR');
    expect(results[1].message).toContain('Next request processed');
  });

  it('should handle lines without stack traces', () => {
    const lines = [
      '2024-01-15T10:30:00Z INFO: Request received',
      '2024-01-15T10:30:01Z INFO: Response sent',
    ];
    const results = parseMultiLine(lines, 'api');
    expect(results.length).toBe(2);
    expect(results[0].stack_trace).toBeNull();
    expect(results[1].stack_trace).toBeNull();
  });

  it('should skip empty lines', () => {
    const lines = ['INFO: first', '', '  ', 'INFO: second'];
    const results = parseMultiLine(lines, 'api');
    expect(results.length).toBe(2);
  });

  it('should handle Python tracebacks', () => {
    const lines = [
      'Traceback (most recent call last):',
      '  File "/app/main.py", line 10, in main',
      '    result = process()',
      '  File "/app/process.py", line 5, in process',
      '    raise ValueError("bad input")',
    ];
    const results = parseMultiLine(lines, 'python-svc');
    expect(results.length).toBe(1);
    expect(results[0].stack_trace).toContain('main.py');
    expect(results[0].stack_trace).toContain('process.py');
  });

  it('should preserve raw field for each entry', () => {
    const lines = ['GET /api/test 200 5 ms'];
    const results = parseMultiLine(lines, 'web');
    expect(results[0].raw).toBe('GET /api/test 200 5 ms');
  });
});
