export const fullnodeTransactionFixtures = {
  confirmed: { type: "user_transaction", success: true },
  pending: { type: "pending_transaction" },
  failed: { type: "user_transaction", success: false, vm_status: "Move abort" },
} as const;

export const fullnodeHttpFixtures = {
  missing: { status: 404 },
  goneAfterReset: { status: 410 },
  rateLimited: { status: 429 },
  serverError: { status: 500 },
} as const;
