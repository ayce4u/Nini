import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Category } from './category.entity.js';
import { Public } from '../common/roles.js';
import { QUARTIERS } from '../common/quartiers.js';

@ApiTags('Référentiels')
@Controller()
export class CategoriesController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Public()
  @Get('categories')
  async categories() {
    const rows: Array<Category & { count: string }> = await this.db.query(
      `SELECT c.*, (SELECT COUNT(*) FROM providers p WHERE p."categorySlug" = c.slug AND p.published) AS count
       FROM categories c ORDER BY c."sortOrder", c.name`,
    );
    return rows.map((c) => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      providerCount: Number(c.count),
    }));
  }

  @Public()
  @Get('quartiers')
  quartiers() {
    return QUARTIERS;
  }
}

@Module({ controllers: [CategoriesController] })
export class CategoriesModule {}
