import { Module } from '@nestjs/common';
import { DimensionsService } from './dimensions.service';
import { DimensionsController } from './dimensions.controller';
import { ClaudeModule } from '../claude/claude.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [ClaudeModule, AccountsModule],
  controllers: [DimensionsController],
  providers: [DimensionsService],
  exports: [DimensionsService],
})
export class DimensionsModule {}
