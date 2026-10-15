export type ActionResult<T = undefined> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export const initialResult: ActionResult = { ok: false };
