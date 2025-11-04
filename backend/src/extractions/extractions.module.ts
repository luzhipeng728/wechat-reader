import { Module } from '@nestjs/common';
import { ExtractionsService } from './extractions.service';
import { ExtractionsController } from './extractions.controller';
import { ClaudeModule } from '../claude/claude.module';
import { ArticlesModule } from '../articles/articles.module';
import { DimensionsModule } from '../dimensions/dimensions.module';

@Module({
  imports: [ClaudeModule, ArticlesModule, DimensionsModule],
  controllers: [ExtractionsController],
  providers: [ExtractionsService],
  exports: [ExtractionsService],
})
export class ExtractionsModule {}
