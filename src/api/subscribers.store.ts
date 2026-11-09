import { type Store } from '@agentage/extension';
import { type Join, type Subscriber } from './subscriber.schema.js';

interface Row extends Record<string, unknown> {
  id: string;
  email: string;
  created_at: Date | string;
}

export interface Client {
  ip: string | null;
  userAgent: string | null;
}

const COLUMNS = 'id, email, created_at';
const toSubscriber = (row: Row): Subscriber => ({
  id: row.id,
  email: row.email,
  createdAt: new Date(row.created_at).toISOString(),
});

const INSERT = `insert into subscribers (email, tools, referrer, utm, locale, timezone, page, ip, user_agent)
  values ($1, $2::text[], $3, $4::jsonb, $5, $6, $7, $8, $9)
  on conflict (email) do nothing returning ${COLUMNS}`;

// Idempotent by email: the first row and its context win; created says whether this call made it.
export const joinSubscriber = async (store: Store, join: Join, client: Client) => {
  const { email, utm, ...rest } = join;
  const values = [email, rest.tools ?? [], rest.referrer ?? null, utm ? JSON.stringify(utm) : null];
  const context = [rest.locale ?? null, rest.timezone ?? null, rest.page ?? null];
  const params = [...values, ...context, client.ip, client.userAgent];
  const [inserted] = (await store.query<Row>(INSERT, params)).rows;
  if (inserted) return { subscriber: toSubscriber(inserted), created: true };
  const { rows } = await store.query<Row>(`select ${COLUMNS} from subscribers where email = $1`, [
    email,
  ]);
  return { subscriber: toSubscriber(rows[0] as Row), created: false };
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
