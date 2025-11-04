import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService, CreateAccountDto, UpdateAccountDto } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('公众号管理')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: '创建公众号' })
  create(@Request() req, @Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(req.user.userId, createAccountDto);
  }

  @Get()
  @ApiOperation({ summary: '获取公众号列表' })
  findAll(@Request() req) {
    return this.accountsService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取公众号详情' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.accountsService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新公众号' })
  update(@Param('id') id: string, @Request() req, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountsService.update(id, req.user.userId, updateAccountDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除公众号' })
  remove(@Param('id') id: string, @Request() req) {
    return this.accountsService.remove(id, req.user.userId);
  }
}
