import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  imports: [ConfigModule],
  controllers: [SpacesController],
  providers: [SpacesService],
})
export class SpacesModule {}
