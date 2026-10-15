import { MigrationInterface, QueryRunner } from 'typeorm';
import { CATEGORIES } from '../seed-categories.js';

/** Première version du schéma : toutes les tables de l'app, plus les catégories de départ. */

export class Init1792093981995 implements MigrationInterface {
  name = 'Init1792093981995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostGIS calcule les distances GPS ; uuid-ossp fabrique les identifiants.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "categories" ("slug" character varying(40) NOT NULL, "name" character varying(80) NOT NULL, "icon" character varying(60) NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_420d9f679d41281f282f5bc7d09" PRIMARY KEY ("slug"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "provider_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "name" character varying(120) NOT NULL, "description" text NOT NULL DEFAULT '', "priceFcfa" integer NOT NULL, "priceFrom" boolean NOT NULL DEFAULT false, "durationMinutes" integer NOT NULL DEFAULT '60', "active" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c907262c804f6e6a2888ed5e630" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "provider_photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "key" character varying(200) NOT NULL, "isCover" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f1f71bc58ec10fc6f8e48ed8073" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "businessName" character varying(120) NOT NULL, "categorySlug" character varying(40) NOT NULL, "description" text NOT NULL DEFAULT '', "quartier" character varying(80), "city" character varying(80) NOT NULL DEFAULT 'Bamako', "landmark" character varying(200), "location" geography(Point,4326), "mobile" boolean NOT NULL DEFAULT false, "whatsapp" character varying(20), "weeklyHours" jsonb NOT NULL DEFAULT '{"mon":[{"start":"08:00","end":"18:00"}],"tue":[{"start":"08:00","end":"18:00"}],"wed":[{"start":"08:00","end":"18:00"}],"thu":[{"start":"08:00","end":"18:00"}],"fri":[{"start":"08:00","end":"12:30"},{"start":"14:30","end":"18:00"}],"sat":[{"start":"09:00","end":"16:00"}],"sun":[]}', "slotStepMinutes" integer NOT NULL DEFAULT '30', "verified" boolean NOT NULL DEFAULT false, "published" boolean NOT NULL DEFAULT true, "ratingAvg" numeric(3,2) NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "referralCode" character varying(12) NOT NULL, "referredBy" character varying(12), "calendarImportUrl" character varying(500), "calendarToken" character varying(40) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9f6302793e7050b3f1c5dc630a8" UNIQUE ("referralCode"), CONSTRAINT "REL_b0a257f97e76b698c4935b27d7" UNIQUE ("userId"), CONSTRAINT "PK_af13fc2ebf382fe0dad2e4793aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81e454a3ddfad7b389708a081d" ON "providers" USING gist ("location") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(80) NOT NULL, "lastName" character varying(80) NOT NULL, "phone" character varying(20) NOT NULL, "email" character varying(160), "passwordHash" character varying NOT NULL, "role" character varying(12) NOT NULL DEFAULT 'client', "quartier" character varying(80), "city" character varying(80) NOT NULL DEFAULT 'Bamako', "pushToken" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_offs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "reason" character varying(160), "source" character varying(12) NOT NULL DEFAULT 'manual', CONSTRAINT "PK_96e32bf316077ae91d3cec38bfc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d9d92814f389c70d40362efd7d" ON "time_offs"  ("providerId", "startsAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerId" uuid NOT NULL, "clientId" uuid, "clientName" character varying(120), "clientPhone" character varying(20), "serviceId" uuid, "serviceName" character varying(120) NOT NULL, "priceFcfa" integer NOT NULL, "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(12) NOT NULL DEFAULT 'pending', "source" character varying(8) NOT NULL DEFAULT 'app', "note" text, "address" character varying(200), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_677831dc6e48ffe6af2b9513fc" ON "appointments"  ("providerId", "startsAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointmentId" uuid NOT NULL, "providerId" uuid NOT NULL, "clientId" uuid NOT NULL, "rating" smallint NOT NULL, "comment" text NOT NULL DEFAULT '', "reply" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_45a6cefc24d5af16842be69a65a" UNIQUE ("appointmentId"), CONSTRAINT "REL_45a6cefc24d5af16842be69a65" UNIQUE ("appointmentId"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab216326cb267eded8961ed352" ON "reviews"  ("providerId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "favorites" ("userId" uuid NOT NULL, "providerId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_86bb02261883fbf169d019117ea" PRIMARY KEY ("userId", "providerId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_services" ADD CONSTRAINT "FK_1a767698ef032fcd38fc1cbe0cc" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_photos" ADD CONSTRAINT "FK_66da04a327d9e40800fba119710" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" ADD CONSTRAINT "FK_b0a257f97e76b698c4935b27d7d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" ADD CONSTRAINT "FK_5b8bc89512f8d4e59c9895ffc2f" FOREIGN KEY ("categorySlug") REFERENCES "categories"("slug") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_offs" ADD CONSTRAINT "FK_a7c0befc01fd5168de77c72ac33" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_2428e01f899c4edb909e8798b63" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_c4dbd8eb292b83b5dc67be3cf45" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_f77953c373efb8ab146d98e90c3" FOREIGN KEY ("serviceId") REFERENCES "provider_services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_45a6cefc24d5af16842be69a65a" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_4c29faa8169d9741d3a1d514830" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_8bf30713187361f910f8fb3c2c1" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_f3a1749b54e840d382365ad69bb" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    for (const [i, c] of CATEGORIES.entries()) {
      await queryRunner.query(
        `INSERT INTO "categories" ("slug", "name", "icon", "sortOrder") VALUES ($1, $2, $3, $4)`,
        [c.slug, c.name, c.icon, i],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_f3a1749b54e840d382365ad69bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_8bf30713187361f910f8fb3c2c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_4c29faa8169d9741d3a1d514830"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_45a6cefc24d5af16842be69a65a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_f77953c373efb8ab146d98e90c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_c4dbd8eb292b83b5dc67be3cf45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_2428e01f899c4edb909e8798b63"`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_offs" DROP CONSTRAINT "FK_a7c0befc01fd5168de77c72ac33"`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" DROP CONSTRAINT "FK_5b8bc89512f8d4e59c9895ffc2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" DROP CONSTRAINT "FK_b0a257f97e76b698c4935b27d7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_photos" DROP CONSTRAINT "FK_66da04a327d9e40800fba119710"`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_services" DROP CONSTRAINT "FK_1a767698ef032fcd38fc1cbe0cc"`,
    );
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab216326cb267eded8961ed352"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_677831dc6e48ffe6af2b9513fc"`,
    );
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9d92814f389c70d40362efd7d"`,
    );
    await queryRunner.query(`DROP TABLE "time_offs"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_81e454a3ddfad7b389708a081d"`,
    );
    await queryRunner.query(`DROP TABLE "providers"`);
    await queryRunner.query(`DROP TABLE "provider_photos"`);
    await queryRunner.query(`DROP TABLE "provider_services"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
