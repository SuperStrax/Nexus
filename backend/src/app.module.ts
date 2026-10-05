import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service'; // Добавь это
import { AnalyticsModule } from './analytics/analytics.module'; // Импортируй созданный модуль




@Module({
  imports: [AnalyticsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService], // Добавь PrismaService сюда
})
export class AppModule {}