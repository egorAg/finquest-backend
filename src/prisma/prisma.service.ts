import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit {
  private readonly _client: InstanceType<typeof PrismaClient>;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    this._client = new PrismaClient({ adapter });
  }

  get user()            { return this._client.user; }
  get space()           { return this._client.space; }
  get spaceMember()     { return this._client.spaceMember; }
  get transaction()     { return this._client.transaction; }
  get goal()            { return this._client.goal; }
  get challenge()       { return this._client.challenge; }
  get userChallenge()   { return this._client.userChallenge; }
  get achievement()     { return this._client.achievement; }
  get userAchievement() { return this._client.userAchievement; }
  get notification()    { return this._client.notification; }
  get knowledgeArticle(){ return this._client.knowledgeArticle; }
  get spaceInvite()     { return this._client.spaceInvite; }
  get recurringTransaction() { return this._client.recurringTransaction; }
  get announcement()          { return this._client.announcement; }

  async onModuleInit() {
    await this._client.$connect();
  }
}
