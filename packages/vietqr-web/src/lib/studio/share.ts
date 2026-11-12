import {
  DEFAULT_TEMPLATE,
  defaultParams,
  serializeParams,
  type StudioParams,
  type Template,
} from "./params";
import type { StudioPayload } from "./queries";
import { toQuery } from "./validate";

/** Absolute Pay link (`<origin>/pay?...`); values equal to the defaults are omitted. */
export function buildPayLink(
  origin: string,
  params: StudioParams,
  defaultTemplate: Template = DEFAULT_TEMPLATE,
): string {
  const query = serializeParams(params, defaultParams(defaultTemplate));
  const qs = query.toString();
  return `${origin}/pay${qs ? `?${qs}` : ""}`;
}

/** Absolute GET /image URL for embedding. Contains the account number. */
export function buildEmbedUrl(
  origin: string,
  request: StudioPayload["request"],
): string {
  return `${origin}/api/v1/vietqr-core/image?${toQuery(request).toString()}`;
}
