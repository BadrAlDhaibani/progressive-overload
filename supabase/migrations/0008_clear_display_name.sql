-- Clear any display_name values populated from OAuth full_name (Apple sign-in).
-- The app labels users by @username only; display_name is no longer written or read.
-- Column kept for potential future use as a user-editable display name.
update public.profiles set display_name = null where display_name is not null;
