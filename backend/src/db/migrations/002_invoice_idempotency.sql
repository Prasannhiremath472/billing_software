-- Protects checkout against duplicate submissions (double click / network retry).
ALTER TABLE invoices
  ADD COLUMN idempotency_key VARCHAR(64) NULL AFTER notes,
  ADD UNIQUE KEY uq_invoices_idem (cashier_id, idempotency_key);
