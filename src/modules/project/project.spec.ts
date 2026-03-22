import { Test, TestingModule } from '@nestjs/testing';
import { Project } from './project';

describe('Project', () => {
  let provider: Project;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Project],
    }).compile();

    provider = module.get<Project>(Project);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
