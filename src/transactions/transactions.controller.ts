import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getTransactions(@Request() req: any, @Query() query: QueryTransactionsDto) {
    return this.transactionsService.getTransactions(req.user.id, query);
  }

  @Post()
  createTransaction(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.createTransaction(req.user.id, dto);
  }

  @Delete(':id')
  deleteTransaction(@Request() req: any, @Param('id') id: string) {
    return this.transactionsService.deleteTransaction(req.user.id, id);
  }
}
