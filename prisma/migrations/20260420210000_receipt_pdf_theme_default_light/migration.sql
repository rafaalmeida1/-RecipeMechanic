-- Novos recibos: tema claro por padrão (recibos já existentes mantêm o valor atual).
ALTER TABLE "Receipt" ALTER COLUMN "pdfTheme" SET DEFAULT 'LIGHT';
