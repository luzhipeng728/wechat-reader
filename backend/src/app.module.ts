import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { ArticlesModule } from './articles/articles.module';
import { DimensionsModule } from './dimensions/dimensions.module';
import { ExtractionsModule } from './extractions/extractions.module';
import { ModelsModule } from './models/models.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClaudeModule } from './claude/claude.module';
import { SpiderModule } from './spider/spider.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    ArticlesModule,
    DimensionsModule,
    ExtractionsModule,
    ModelsModule,
    ClaudeModule,
    SpiderModule,
  ],
})
export class AppModule {}
