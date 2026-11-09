import { type Store } from '@agentage/extension';
import { type Join, type Subscriber } from './subscriber.schema.js';

type Row = { id: string; email: string; created_at: Date | string; created?: boolean };

const COLUMNS = 'id, email, created_at';
const toSubscriber = (row: Row): Subscriber => ({
  id: row.id,
  email: row.email,
  createdAt: new Date(row.created_at).toISOString(),
});

// Idempotent by email in one statement: a repeat keeps the first row; xmax = 0 only on an insert.
const JOIN = `insert into subscribers (email, referrer, utm, locale, timezone, page, ip, user_agent)
  values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
  on conflict (email) do update set email = excluded.email
  returning ${COLUMNS}, (xmax = 0) as created`;

export const joinSubscriber = async (store: Store, join: Join, ip: string, agent?: string) => {
  const { email, referrer, utm, locale, timezone, page } = join;
  const values = [email, referrer, utm && JSON.stringify(utm), locale, timezone, page, ip, agent];
  const [row] = (
    await store.query<Row>(
      JOIN,
      values.map((v) => v ?? null)
    )
  ).rows as [Row];
  return { subscriber: toSubscriber(row), created: row.created === true };
};

// Newest first; the cursor is the last row's id, so a page starts strictly after it.
const PAGE = `select ${COLUMNS} from subscribers
  where $1::uuid is null or (created_at, id) < (select created_at, id from subscribers where id = $1::uuid)
  order by created_at desc, id desc limit $2`;

export const listSubscribers = async (store: Store, cursor: string | null, limit: number) =>
  (await store.query<Row>(PAGE, [cursor, limit + 1])).rows.map(toSubscriber);

export const removeSubscriber = async (store: Store, email: string): Promise<void> => {
  await store.query('delete from subscribers where email = $1', [email]);
};
