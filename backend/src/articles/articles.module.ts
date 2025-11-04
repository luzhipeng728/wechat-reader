import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { SpiderModule } from '../spider/spider.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ClaudeModule } from '../claude/claude.module';

@Module({
  imports: [SpiderModule, AccountsModule, ClaudeModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
