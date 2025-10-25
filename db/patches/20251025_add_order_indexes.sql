ALTER TABLE orders
  ADD INDEX idx_orders_created_at (created_at),
  ADD INDEX idx_orders_status_created_at (status, created_at);