
-- Rate limit state
CREATE TABLE public.security_rate_limits (
  identifier text NOT NULL,
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  escalation_level integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  PRIMARY KEY (identifier, action)
);
GRANT ALL ON public.security_rate_limits TO service_role;
-- No grants for anon/authenticated: only SECURITY DEFINER RPCs may touch it.
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.security_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX security_rate_limits_locked_until_idx ON public.security_rate_limits (locked_until) WHERE locked_until IS NOT NULL;

-- Security event log
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text,
  action text NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only events" ON public.security_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX security_events_created_idx ON public.security_events (created_at DESC);
CREATE INDEX security_events_action_idx ON public.security_events (action, created_at DESC);

-- Escalating cooldown ladder (seconds): 0, 30s, 2m, 10m, 1h
CREATE OR REPLACE FUNCTION public._cooldown_for_level(_level integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _level <= 0 THEN 0
    WHEN _level = 1 THEN 30
    WHEN _level = 2 THEN 120
    WHEN _level = 3 THEN 600
    ELSE 3600
  END;
$$;

-- Main rate limiter — callable by anon + authenticated (needed pre-auth)
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  _identifier text,
  _action text,
  _max_attempts integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.security_rate_limits;
  _now timestamptz := now();
  _cooldown integer;
  _retry_after integer;
BEGIN
  IF _identifier IS NULL OR length(trim(_identifier)) = 0 THEN
    RETURN jsonb_build_object('allowed', true, 'retry_after', 0, 'attempts', 0);
  END IF;

  SELECT * INTO _row FROM public.security_rate_limits
    WHERE identifier = _identifier AND action = _action FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.security_rate_limits(identifier, action, attempts, window_started_at, last_attempt_at)
      VALUES (_identifier, _action, 1, _now, _now);
    RETURN jsonb_build_object('allowed', true, 'retry_after', 0, 'attempts', 1);
  END IF;

  -- Still locked?
  IF _row.locked_until IS NOT NULL AND _row.locked_until > _now THEN
    _retry_after := GREATEST(1, EXTRACT(EPOCH FROM (_row.locked_until - _now))::int);
    INSERT INTO public.security_events(identifier, action, event_type, metadata)
      VALUES (_identifier, _action, 'rate_limit_blocked',
              jsonb_build_object('retry_after', _retry_after, 'level', _row.escalation_level));
    RETURN jsonb_build_object('allowed', false, 'retry_after', _retry_after, 'attempts', _row.attempts, 'locked', true);
  END IF;

  -- Window expired → reset counter (but keep escalation level decaying slowly)
  IF _row.window_started_at + make_interval(secs => _window_seconds) < _now THEN
    UPDATE public.security_rate_limits
      SET attempts = 1,
          window_started_at = _now,
          last_attempt_at = _now,
          locked_until = NULL,
          escalation_level = GREATEST(0, _row.escalation_level - 1)
      WHERE identifier = _identifier AND action = _action;
    RETURN jsonb_build_object('allowed', true, 'retry_after', 0, 'attempts', 1);
  END IF;

  -- Within window → increment
  IF _row.attempts + 1 > _max_attempts THEN
    -- Escalate
    _cooldown := public._cooldown_for_level(_row.escalation_level + 1);
    UPDATE public.security_rate_limits
      SET attempts = _row.attempts + 1,
          last_attempt_at = _now,
          escalation_level = _row.escalation_level + 1,
          locked_until = _now + make_interval(secs => _cooldown)
      WHERE identifier = _identifier AND action = _action;
    INSERT INTO public.security_events(identifier, action, event_type, metadata)
      VALUES (_identifier, _action, 'rate_limit_exceeded',
              jsonb_build_object('cooldown', _cooldown, 'level', _row.escalation_level + 1));
    RETURN jsonb_build_object('allowed', false, 'retry_after', _cooldown, 'attempts', _row.attempts + 1, 'locked', true);
  END IF;

  UPDATE public.security_rate_limits
    SET attempts = _row.attempts + 1, last_attempt_at = _now
    WHERE identifier = _identifier AND action = _action;
  RETURN jsonb_build_object('allowed', true, 'retry_after', 0, 'attempts', _row.attempts + 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_record_rate_limit(text, text, integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(_identifier text, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.security_rate_limits WHERE identifier = _identifier AND action = _action;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_security_event(
  _identifier text, _action text, _event_type text, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.security_events(identifier, action, event_type, metadata)
  VALUES (_identifier, _action, _event_type, COALESCE(_metadata, '{}'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, text, jsonb) TO anon, authenticated;
