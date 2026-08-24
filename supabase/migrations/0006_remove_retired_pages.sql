-- Retire the public Pricing and Design System pages from CMS-managed content.
-- Keep the historical pricing table schema intact so existing installations
-- can roll forward safely; only remove content that is no longer published.
delete from seo_settings where page_key in ('pricing', 'design-system');
delete from pricing where id = 1;
