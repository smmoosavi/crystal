/* eslint-disable no-restricted-syntax */

/*
 * This file demonstrates a schema that's autogenerated by some user-supplied
 * data sources (hence the "no data gathering" - we skip the gather phase).
 */

import type { PgExecutorContextPlans, WithPgClient } from "@dataplan/pg";
import {
  PgExecutor,
  PgSource,
  PgSourceBuilder,
  recordType,
  sqlFromArgDigests,
  TYPES,
} from "@dataplan/pg";
import { makeNodePostgresWithPgClient } from "@dataplan/pg/adaptors/node-postgres";
import chalk from "chalk";
import { readFile } from "fs/promises";
import { context, object } from "grafast";
import {
  buildSchema,
  defaultPreset as graphileBuildPreset,
  QueryQueryPlugin,
} from "graphile-build";
import { resolvePresets } from "graphile-config";
import { EXPORTABLE, exportSchema } from "graphile-export";
import { graphql, printSchema } from "graphql";
import { Pool } from "pg";
import sql from "pg-sql2";
import { inspect } from "util";

import { defaultPreset as graphileBuildPgPreset } from "../index.js";

declare global {
  namespace GraphileBuild {
    interface GraphileResolverContext {
      pgSettings: {
        [key: string]: string;
      } | null;
      withPgClient: WithPgClient;
    }
  }
}

const pool = new Pool({
  connectionString: "pggql_test",
});
const withPgClient: WithPgClient = makeNodePostgresWithPgClient(pool);

async function main() {
  // Create our GraphQL schema by applying all the plugins
  const executor = EXPORTABLE(
    (PgExecutor, context, object) =>
      new PgExecutor({
        name: "main",
        context: () =>
          object({
            pgSettings:
              context<GraphileBuild.GraphileResolverContext>().get(
                "pgSettings",
              ),
            withPgClient:
              context<GraphileBuild.GraphileResolverContext>().get(
                "withPgClient",
              ),
          } as PgExecutorContextPlans<any>),
      }),
    [PgExecutor, context, object],
  );
  // TODO: extract this to be usable in general and not specific to this
  // example file.
  const UseRelationNamesPlugin: GraphileConfig.Plugin = {
    name: "UseRelationNamesPlugin",
    version: "0.0.0",
    inflection: {
      replace: {
        singleRelation(previous, options, details) {
          return this.camelCase(details.identifier);
        },
        singleRelationBackwards(previous, options, details) {
          return this.camelCase(details.identifier);
        },
        manyRelationConnection(previous, options, details) {
          return this.camelCase(details.identifier);
        },
        manyRelationList(previous, options, details) {
          return this.camelCase(`${details.identifier}-list`);
        },
      },
    },
  };
  const config = resolvePresets([
    {
      extends: [graphileBuildPreset, graphileBuildPgPreset],
      plugins: [QueryQueryPlugin, UseRelationNamesPlugin],
    },
  ]);

  const usersCodec = EXPORTABLE(
    (TYPES, recordType, sql) =>
      recordType(
        `app_public.users`,
        sql`app_public.users`,
        {
          id: {
            codec: TYPES.uuid,
            notNull: true,
            extensions: {
              tags: {
                hasDefault: true,
              },
            },
          },
          username: {
            codec: TYPES.text,
            notNull: true,
          },
          gravatar_url: {
            codec: TYPES.text,
            notNull: false,
          },
          created_at: {
            codec: TYPES.timestamptz,
            notNull: true,
          },
        },
        {
          tags: {
            name: "users",
          },
        },
      ),
    [TYPES, recordType, sql],
  );

  const forumsCodec = EXPORTABLE(
    (TYPES, recordType, sql) =>
      recordType(
        `app_public.forums`,
        sql`app_public.forums`,
        {
          id: {
            codec: TYPES.uuid,
            notNull: true,
            extensions: {
              tags: {
                hasDefault: true,
              },
            },
          },
          name: {
            codec: TYPES.text,
            notNull: true,
          },
          archived_at: {
            codec: TYPES.timestamptz,
            notNull: false,
          },
        },
        {
          tags: {
            name: "forums",
          },
        },
      ),
    [TYPES, recordType, sql],
  );

  const messagesCodec = EXPORTABLE(
    (TYPES, recordType, sql) =>
      recordType(
        `app_public.messages`,
        sql`app_public.messages`,
        {
          id: {
            codec: TYPES.uuid,
            notNull: true,
            extensions: {
              tags: {
                hasDefault: true,
              },
            },
          },
          forum_id: {
            codec: TYPES.uuid,
            notNull: true,
          },
          author_id: {
            codec: TYPES.uuid,
            notNull: true,
          },
          body: {
            codec: TYPES.text,
            notNull: true,
          },
          featured: {
            codec: TYPES.boolean,
            notNull: true,
          },
          created_at: {
            codec: TYPES.timestamptz,
            notNull: true,
          },
          archived_at: {
            codec: TYPES.timestamptz,
            notNull: false,
          },
        },
        {
          tags: {
            name: "messages",
          },
        },
      ),
    [TYPES, recordType, sql],
  );

  const usersSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, executor, usersCodec) =>
      new PgSourceBuilder({
        name: "users",
        executor,
        source: usersCodec.sqlType,
        codec: usersCodec,
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSourceBuilder, executor, usersCodec],
  );

  const forumsSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, executor, forumsCodec) =>
      new PgSourceBuilder({
        //name: "main.app_public.forums",
        name: "forums",
        executor,
        source: forumsCodec.sqlType,
        codec: forumsCodec,
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSourceBuilder, executor, forumsCodec],
  );

  const messagesSourceBuilder = EXPORTABLE(
    (PgSourceBuilder, executor, messagesCodec) =>
      new PgSourceBuilder({
        name: "messages",
        executor,
        source: messagesCodec.sqlType,
        codec: messagesCodec,
        uniques: [{ columns: ["id"], isPrimary: true }],
      }),
    [PgSourceBuilder, executor, messagesCodec],
  );

  const usersSource = EXPORTABLE(
    (messagesSourceBuilder, usersSourceBuilder) =>
      usersSourceBuilder.build({
        relations: {
          messages: {
            source: messagesSourceBuilder,
            isUnique: false,
            localColumns: ["id"],
            remoteColumns: ["author_id"],
          },
        },
      }),
    [messagesSourceBuilder, usersSourceBuilder],
  );
  const forumsSource = EXPORTABLE(
    (forumsSourceBuilder, messagesSourceBuilder) =>
      forumsSourceBuilder.build({
        relations: {
          messages: {
            source: messagesSourceBuilder,
            isUnique: false,
            localColumns: ["id"],
            remoteColumns: ["forum_id"],
            extensions: {
              tags: {
                behavior: "connection list",
              },
            },
          },
        },
      }),
    [forumsSourceBuilder, messagesSourceBuilder],
  );
  const messagesSource = EXPORTABLE(
    (forumsSource, messagesSourceBuilder, usersSource) =>
      messagesSourceBuilder.build({
        relations: {
          author: {
            source: usersSource,
            isUnique: true,
            localColumns: ["author_id"],
            remoteColumns: ["id"],
          },
          forum: {
            source: forumsSource,
            isUnique: true,
            localColumns: ["forum_id"],
            remoteColumns: ["id"],
          },
        },
      }),
    [forumsSource, messagesSourceBuilder, usersSource],
  );

  const uniqueAuthorCountSource = EXPORTABLE(
    (PgSource, TYPES, executor, sql, sqlFromArgDigests) =>
      new PgSource({
        executor,
        codec: TYPES.int,
        source: (...args) =>
          sql`app_public.unique_author_count(${sqlFromArgDigests(args)})`,
        name: "unique_author_count",
        parameters: [
          {
            name: "featured",
            required: false,
            codec: TYPES.boolean,
          },
        ],
        extensions: {
          tags: {
            behavior: "queryField",
          },
        },
      }),
    [PgSource, TYPES, executor, sql, sqlFromArgDigests],
  );

  const forumsUniqueAuthorCountSource = EXPORTABLE(
    (PgSource, TYPES, executor, forumsCodec, sql, sqlFromArgDigests) =>
      new PgSource({
        executor,
        codec: TYPES.int,
        isUnique: true,
        source: (...args) =>
          sql`app_public.forums_unique_author_count(${sqlFromArgDigests(
            args,
          )})`,
        name: "forums_unique_author_count",
        parameters: [
          {
            name: "forum",
            codec: forumsCodec,
            required: true,
            notNull: true,
          },
          {
            name: "featured",
            codec: TYPES.boolean,
            required: false,
            notNull: false,
          },
        ],
        extensions: {
          tags: {
            // behavior: ["typeField"],
            name: "unique_author_count",
          },
        },
      }),
    [PgSource, TYPES, executor, forumsCodec, sql, sqlFromArgDigests],
  );

  const forumsRandomUser = EXPORTABLE(
    (PgSource, executor, forumsCodec, sql, sqlFromArgDigests, usersCodec) =>
      new PgSource({
        executor,
        codec: usersCodec,
        isUnique: true,
        source: (...args) =>
          sql`app_public.forums_random_user(${sqlFromArgDigests(args)})`,
        name: "forums_random_user",
        parameters: [
          {
            name: "forum",
            codec: forumsCodec,
            required: true,
            notNull: true,
          },
        ],
        extensions: {
          tags: {
            // behavior: ["typeField"],
            name: "random_user",
          },
        },
      }),
    [PgSource, executor, forumsCodec, sql, sqlFromArgDigests, usersCodec],
  );

  const forumsFeaturedMessages = EXPORTABLE(
    (PgSource, executor, forumsCodec, messagesCodec, sql, sqlFromArgDigests) =>
      new PgSource({
        executor,
        codec: messagesCodec,
        isUnique: false,
        source: (...args) =>
          sql`app_public.forums_featured_messages(${sqlFromArgDigests(args)})`,
        name: "forums_featured_messages",
        parameters: [
          {
            name: "forum",
            codec: forumsCodec,
            required: true,
            notNull: true,
          },
        ],
        extensions: {
          tags: {
            behavior: "typeField connection list",
            name: "featured_messages",
          },
        },
      }),
    [PgSource, executor, forumsCodec, messagesCodec, sql, sqlFromArgDigests],
  );

  // We're crafting our own input
  const input: GraphileBuild.BuildInput = {
    pgSources: [
      usersSource,
      forumsSource,
      messagesSource,
      uniqueAuthorCountSource,
      forumsUniqueAuthorCountSource,
      forumsRandomUser,
      forumsFeaturedMessages,
    ],
  };
  const schema = buildSchema(config, input);

  // Output our schema
  console.log(chalk.blue(printSchema(schema)));
  console.log();
  console.log();
  console.log();

  // Common GraphQL arguments
  const source = /* GraphQL */ `
    query {
      allForumsList {
        id
        name
        archivedAt
      }
      allForums {
        nodes {
          id
          name
          archivedAt
          messagesList {
            id
            body
            forumId
            authorId
          }
        }
        edges {
          cursor
          node {
            id
            name
            archivedAt
            messages {
              nodes {
                id
                body
                forumId
                authorId
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
      allUsersList {
        id
        username
        gravatarUrl
        createdAt
        messages {
          totalCount
        }
      }
      allMessagesList {
        id
        forumId
        authorId
        body
        featured
        createdAt
        archivedAt
        forum {
          name
          uniqueAuthorCount
          uniqueAuthorCountFeatured: uniqueAuthorCount(featured: true)
          randomUser {
            id
            username
          }
          featuredMessages {
            nodes {
              id
              body
              featured
            }
          }
          featuredMessagesList {
            id
            body
            featured
          }
        }
        author {
          username
        }
      }
    }
  `;

  const rootValue = null;
  const contextValue = {
    withPgClient,
  };
  const variableValues = {};

  // Run our query
  const result = await graphql({
    schema,
    source,
    rootValue,
    variableValues,
    contextValue,
  });
  console.log(inspect(result, { depth: Infinity, colors: true }));

  if ("errors" in result && result.errors) {
    process.exit(1);
  }

  // Export schema
  // const exportFileLocation = new URL("../../temp.js", import.meta.url);
  const exportFileLocation = `${__dirname}/../../temp.mjs`;
  await exportSchema(schema, exportFileLocation);

  // output code
  console.log(chalk.green(await readFile(exportFileLocation, "utf8")));

  // run code
  const { schema: schema2 } = await import(exportFileLocation.toString());
  const result2 = await graphql({
    schema: schema2,
    source,
    rootValue,
    variableValues,
    contextValue,
  });
  console.log(inspect(result2, { depth: Infinity, colors: true }));
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
