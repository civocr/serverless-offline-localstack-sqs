import { DockerDetector } from '../src/utils/docker';
import { createLogger } from '../src/utils/logger';

// Mock dockerode to avoid actual Docker calls in tests
jest.mock('dockerode');

describe('DockerDetector', () => {
  let dockerDetector: DockerDetector;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    dockerDetector = new DockerDetector(mockLogger);
  });

  describe('getEndpointUrl', () => {
    it('should return custom endpoint when provided', async () => {
      const customEndpoint = 'http://custom:4566';
      const result = await dockerDetector.getEndpointUrl(customEndpoint);
      
      expect(result).toBe(customEndpoint);
    });

    it('should return default endpoint when Docker is not available', async () => {
      // Mock Docker detection methods
      jest.spyOn(dockerDetector as any, 'detectDocker').mockResolvedValue({
        isRunning: false,
        isDockerDesktop: false,
        host: 'localhost',
        port: 4566,
      });

      const result = await dockerDetector.getEndpointUrl();
      
      expect(result).toBe('http://localhost:4566');
    });

    it('should return Docker internal host when running inside container', async () => {
      jest.spyOn(dockerDetector as any, 'detectDocker').mockResolvedValue({
        isRunning: true,
        isDockerDesktop: false,
        host: 'localstack',
        port: 4566,
      });

      const result = await dockerDetector.getEndpointUrl();
      
      expect(result).toBe('http://localstack:4566');
    });
  });

  describe('detectDocker', () => {
    beforeEach(() => {
      // Reset all method mocks
      jest.clearAllMocks();
    });

    it('should return default info when Docker is not available', async () => {
      jest.spyOn(dockerDetector as any, 'isDockerAvailable').mockResolvedValue(false);

      const result = await dockerDetector.detectDocker();

      expect(result).toEqual({
        isRunning: false,
        isDockerDesktop: false,
        host: 'localhost',
        port: 4566,
      });
    });

    it('should detect when running inside Docker container', async () => {
      jest.spyOn(dockerDetector as any, 'isDockerAvailable').mockResolvedValue(true);
      jest.spyOn(dockerDetector as any, 'isRunningInDocker').mockResolvedValue(true);
      jest.spyOn(dockerDetector as any, 'getDockerInternalHost').mockReturnValue('localstack');

      const result = await dockerDetector.detectDocker();

      expect(result).toEqual({
        isRunning: true,
        isDockerDesktop: false,
        host: 'localstack',
        port: 4566,
      });
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(dockerDetector as any, 'isDockerAvailable').mockRejectedValue(new Error('Test error'));

      const result = await dockerDetector.detectDocker();

      expect(result).toEqual({
        isRunning: false,
        isDockerDesktop: false,
        host: 'localhost',
        port: 4566,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Error detecting Docker environment:', expect.any(Error));
    });
  });
});