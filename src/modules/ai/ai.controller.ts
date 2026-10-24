import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt-auth.guard';
import { User } from 'src/common/decorators/auth/user.decorator';
import { UserDto } from '../users/dto/UserDto';
import { AiService } from './ai.service';

@ApiTags('AI Module')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('overlap-analysis/:projectId')
  @ApiOperation({ summary: 'Анализ пересечений полигонов' })
  @ApiResponse({ status: 200, description: 'Результаты анализа конфликтов' })
  async analyzeOverlaps(@Param('projectId') projectId: number) {
    return this.aiService.analyzeOverlaps(+projectId);
  }

  @Get('norm-check/:projectId')
  @ApiOperation({ summary: 'Проверка соответствия нормам' })
  @ApiResponse({ status: 200, description: 'Результаты проверки норм' })
  async checkNormCompliance(@Param('projectId') projectId: number) {
    return this.aiService.checkNormCompliance(+projectId);
  }

  @Post('generate-division')
  @ApiOperation({ summary: 'Генерация вариантов раздела участков' })
  @ApiResponse({ status: 200, description: 'Варианты раздела' })
  async generateDivisionOptions(
    @Body()
    data: {
      projectId: number;
      targetCount: number;
      requirements?: any;
    },
  ) {
    return this.aiService.generateDivisionOptions(
      data.projectId,
      data.targetCount,
      data.requirements,
    );
  }

  @Post('nlp-command')
  @ApiOperation({ summary: 'Обработка текстовой команды (NLP)' })
  @ApiResponse({ status: 200, description: 'Ответ на запрос' })
  async processNlpCommand(
    @Body() data: { command: string },
    @User() user: UserDto,
  ) {
    return this.aiService.processNaturalLanguageCommand(user.id!, data.command);
  }

  @Get('cadastre-question')
  @ApiOperation({ summary: 'Ответ на вопрос по кадастру (NLP)' })
  @ApiResponse({ status: 200, description: 'Ответ с ссылками на нормативы' })
  async answerQuestion(@Query('q') question: string) {
    return this.aiService.answerCadastreQuestion(question);
  }

  @Get('context-analysis/:projectId')
  @ApiOperation({ summary: 'Анализ контекста местности' })
  @ApiResponse({ status: 200, description: 'Предложения по границам' })
  async analyzeContext(@Param('projectId') projectId: number) {
    return this.aiService.analyzeContext(+projectId);
  }
}
