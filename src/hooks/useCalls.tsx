import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

export type CallType = "voice" | "video";
export type CallStatus = "calling" | "ringing" | "accepted" | "rejected" | "missed" | "ended" | "cancelled";

export interface CallRow {
  id: string;
  caller_id: string;
  receiver_id: string;
  chat_id: string | null;
  call_type: CallType;
  status: CallStatus;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface PeerProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export type ConnectionQuality = "excellent" | "good" | "poor" | "connecting";

export interface CallSession {
  call: CallRow;
  peer: PeerProfile | null;
  isCaller: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "new";
  quality: ConnectionQuality;
  micMuted: boolean;
  cameraOff: boolean;
  speakerOn: boolean;
  facing: "user" | "environment";
  startedAt: number | null;
}

interface CallContextValue {
  session: CallSession | null;
  incoming: { call: CallRow; peer: PeerProfile | null } | null;
  startCall: (receiverId: string, type: CallType, chatId?: string | null) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

const RING_TIMEOUT_MS = 45_000;

async function fetchProfile(id: string): Promise<PeerProfile | null> {
  const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url").eq("id", id).maybeSingle();
  return (data as PeerProfile | null) ?? null;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<CallSession | null>(null);
  const [incoming, setIncoming] = useState<{ call: CallRow; peer: PeerProfile | null } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const remoteDescSetRef = useRef(false);

  // ------- Ringtone -------
  const startRingtone = useCallback(() => {
    try {
      if (ringtoneRef.current) return;
      // Simple synthesized ringtone using WebAudio to avoid asset dependency.
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 480;
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 620;
      osc.connect(gain);
      osc2.connect(gain);
      osc.start();
      osc2.start();
      // pulse
      let on = true;
      const iv = window.setInterval(() => {
        on = !on;
        gain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.02);
      }, 700);
      ringtoneRef.current = { pause: () => { osc.stop(); osc2.stop(); ctx.close(); clearInterval(iv); } } as unknown as HTMLAudioElement;
      if ("vibrate" in navigator) {
        navigator.vibrate?.([400, 200, 400, 200, 400]);
      }
    } catch (e) {
      console.warn("[Aurix] ringtone failed", e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      try { ringtoneRef.current.pause(); } catch { /* noop */ }
      ringtoneRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate?.(0);
  }, []);

  // ------- Cleanup -------
  const teardown = useCallback(() => {
    stopRingtone();
    if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null; }
    if (statsTimerRef.current) { clearInterval(statsTimerRef.current); statsTimerRef.current = null; }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch { /* noop */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;
    setSession(null);
  }, [stopRingtone]);

  // ------- Signaling helpers -------
  const sendSignal = useCallback((event: string, payload: Record<string, unknown>) => {
    const ch = signalChannelRef.current;
    if (!ch) return;
    ch.send({ type: "broadcast", event, payload });
  }, []);

  const attachPeerConnection = useCallback((callType: CallType) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", { candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      setSession(prev => prev ? { ...prev, remoteStream: stream } : prev);
    };
    pc.onconnectionstatechange = () => {
      setSession(prev => prev ? { ...prev, connectionState: pc.connectionState } : prev);
      if (pc.connectionState === "failed") {
        toast.error("Call connection failed");
        void endCallRef.current?.();
      }
    };

    // stats loop for quality
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    statsTimerRef.current = window.setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let rtt = 0, loss = 0;
        stats.forEach(r => {
          if (r.type === "candidate-pair" && (r as RTCIceCandidatePairStats).state === "succeeded") {
            const cp = r as RTCIceCandidatePairStats & { currentRoundTripTime?: number };
            if (typeof cp.currentRoundTripTime === "number") rtt = cp.currentRoundTripTime * 1000;
          }
          if (r.type === "inbound-rtp") {
            const ir = r as RTCInboundRtpStreamStats & { packetsLost?: number; packetsReceived?: number };
            if (ir.packetsReceived && ir.packetsLost != null) {
              loss = Math.max(loss, ir.packetsLost / Math.max(1, ir.packetsReceived + ir.packetsLost));
            }
          }
        });
        const quality: ConnectionQuality = rtt < 150 && loss < 0.03 ? "excellent" : rtt < 300 && loss < 0.08 ? "good" : "poor";
        setSession(prev => prev ? { ...prev, quality } : prev);
      } catch { /* noop */ }
    }, 2500);

    void callType;
    return pc;
  }, [sendSignal]);

  const getMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const subscribeSignaling = useCallback((callId: string, iAmCaller: boolean) => {
    const channel = supabase.channel(`call:${callId}`, { config: { broadcast: { self: false, ack: false } } });

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      const pc = pcRef.current;
      if (!pc || iAmCaller) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      remoteDescSetRef.current = true;
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ }
      }
      pendingCandidatesRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal("answer", { sdp: answer });
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      const pc = pcRef.current;
      if (!pc || !iAmCaller) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      remoteDescSetRef.current = true;
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ }
      }
      pendingCandidatesRef.current = [];
    });

    channel.on("broadcast", { event: "ice" }, async ({ payload }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (!remoteDescSetRef.current) {
        pendingCandidatesRef.current.push(payload.candidate);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { /* noop */ }
      }
    });

    channel.on("broadcast", { event: "hangup" }, () => {
      void endCallRef.current?.(true);
    });

    channel.subscribe();
    signalChannelRef.current = channel;
    return channel;
  }, [sendSignal]);

  // ------- Public: start / accept / reject / end -------
  const startCall = useCallback(async (receiverId: string, type: CallType, chatId: string | null = null) => {
    if (!user) { toast.error("Sign in required"); return; }
    if (session) { toast.error("Already in a call"); return; }
    try {
      const stream = await getMedia(type);
      const { data, error } = await supabase.from("calls").insert({
        caller_id: user.id, receiver_id: receiverId, chat_id: chatId, call_type: type, status: "ringing",
      }).select("*").single();
      if (error || !data) throw error ?? new Error("Failed to create call");
      const call = data as CallRow;
      const peer = await fetchProfile(receiverId);

      setSession({
        call, peer, isCaller: true,
        localStream: stream, remoteStream: null,
        connectionState: "new", quality: "connecting",
        micMuted: false, cameraOff: false, speakerOn: type === "video", facing: "user",
        startedAt: null,
      });

      subscribeSignaling(call.id, true);
      const pc = attachPeerConnection(type);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // Wait a tick for channel to subscribe before sending offer
      setTimeout(async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal("offer", { sdp: offer });
        } catch (e) { console.error("[Aurix] offer failed", e); }
      }, 400);

      // Timeout → missed
      ringTimerRef.current = window.setTimeout(async () => {
        if (pcRef.current && pcRef.current.connectionState !== "connected") {
          await supabase.from("calls").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", call.id);
          teardown();
          toast("No answer");
        }
      }, RING_TIMEOUT_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Call failed";
      toast.error(msg);
      teardown();
    }
  }, [user, session, getMedia, subscribeSignaling, attachPeerConnection, sendSignal, teardown]);

  const acceptCall = useCallback(async () => {
    if (!incoming || !user) return;
    const inc = incoming;
    setIncoming(null);
    stopRingtone();
    try {
      const stream = await getMedia(inc.call.call_type);
      setSession({
        call: inc.call, peer: inc.peer, isCaller: false,
        localStream: stream, remoteStream: null,
        connectionState: "new", quality: "connecting",
        micMuted: false, cameraOff: false, speakerOn: inc.call.call_type === "video", facing: "user",
        startedAt: Date.now(),
      });
      subscribeSignaling(inc.call.id, false);
      const pc = attachPeerConnection(inc.call.call_type);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await supabase.from("calls").update({ status: "accepted", started_at: new Date().toISOString() }).eq("id", inc.call.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cannot accept call";
      toast.error(msg);
      await supabase.from("calls").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", inc.call.id);
      teardown();
    }
  }, [incoming, user, getMedia, subscribeSignaling, attachPeerConnection, stopRingtone, teardown]);

  const rejectCall = useCallback(async () => {
    if (!incoming) return;
    const id = incoming.call.id;
    setIncoming(null);
    stopRingtone();
    await supabase.from("calls").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", id);
  }, [incoming, stopRingtone]);

  const endCall = useCallback(async (remote = false) => {
    const s = session;
    if (!s) { teardown(); return; }
    try {
      if (!remote) sendSignal("hangup", {});
      const startedAt = s.startedAt ?? (s.call.started_at ? new Date(s.call.started_at).getTime() : Date.now());
      const duration = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const finalStatus: CallStatus = s.connectionState === "connected" || s.call.status === "accepted" ? "ended" : "cancelled";
      await supabase.from("calls").update({
        status: finalStatus, ended_at: new Date().toISOString(), duration_seconds: duration,
      }).eq("id", s.call.id);
    } catch { /* noop */ }
    teardown();
  }, [session, sendSignal, teardown]);

  const endCallRef = useRef(endCall);
  useEffect(() => { endCallRef.current = endCall; }, [endCall]);

  // Track started_at when call becomes accepted (caller side hears status change via postgres_changes below).
  useEffect(() => {
    if (session && session.connectionState === "connected" && !session.startedAt) {
      setSession(prev => prev ? { ...prev, startedAt: Date.now() } : prev);
      if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null; }
    }
  }, [session]);

  // ------- Controls -------
  const toggleMic = useCallback(() => {
    const s = session; if (!s?.localStream) return;
    const on = !s.micMuted;
    s.localStream.getAudioTracks().forEach(t => { t.enabled = !on; });
    setSession(prev => prev ? { ...prev, micMuted: on } : prev);
  }, [session]);

  const toggleCamera = useCallback(() => {
    const s = session; if (!s?.localStream) return;
    const on = !s.cameraOff;
    s.localStream.getVideoTracks().forEach(t => { t.enabled = !on; });
    setSession(prev => prev ? { ...prev, cameraOff: on } : prev);
  }, [session]);

  const toggleSpeaker = useCallback(() => {
    setSession(prev => prev ? { ...prev, speakerOn: !prev.speakerOn } : prev);
  }, []);

  const switchCamera = useCallback(async () => {
    const s = session; if (!s?.localStream || s.call.call_type !== "video") return;
    const next = s.facing === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const pc = pcRef.current;
      const sender = pc?.getSenders().find(sn => sn.track?.kind === "video");
      await sender?.replaceTrack(newTrack);
      s.localStream.getVideoTracks().forEach(t => t.stop());
      s.localStream.removeTrack(s.localStream.getVideoTracks()[0]);
      s.localStream.addTrack(newTrack);
      setSession(prev => prev ? { ...prev, facing: next, localStream: s.localStream } : prev);
    } catch (e) {
      toast.error("Camera switch failed");
      console.warn(e);
    }
  }, [session]);

  // ------- Incoming call listener -------
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`incoming-calls:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "calls",
        filter: `receiver_id=eq.${user.id}`,
      }, async ({ new: row }) => {
        const call = row as CallRow;
        if (call.status !== "ringing" && call.status !== "calling") return;
        if (session || incoming) {
          // busy - auto reject
          await supabase.from("calls").update({ status: "rejected", ended_at: new Date().toISOString() }).eq("id", call.id);
          return;
        }
        const peer = await fetchProfile(call.caller_id);
        setIncoming({ call, peer });
        startRingtone();
        // auto-miss after timeout
        window.setTimeout(async () => {
          setIncoming(prev => {
            if (prev?.call.id === call.id) {
              void supabase.from("calls").update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", call.id);
              stopRingtone();
              return null;
            }
            return prev;
          });
        }, RING_TIMEOUT_MS);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "calls",
      }, ({ new: row }) => {
        const call = row as CallRow;
        // Caller: react to receiver actions.
        setSession(prev => {
          if (!prev || prev.call.id !== call.id) return prev;
          if (call.status === "rejected" || call.status === "missed" || call.status === "ended" || call.status === "cancelled") {
            toast(call.status === "rejected" ? "Call declined" : call.status === "missed" ? "No answer" : "Call ended");
            setTimeout(() => teardown(), 50);
            return prev;
          }
          if (call.status === "accepted" && prev.isCaller) {
            return { ...prev, call, startedAt: prev.startedAt ?? Date.now() };
          }
          return { ...prev, call };
        });
        setIncoming(prev => {
          if (prev?.call.id === call.id && (call.status === "ended" || call.status === "cancelled")) {
            stopRingtone();
            return null;
          }
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, session, incoming, startRingtone, stopRingtone, teardown]);

  // Cleanup on unmount
  useEffect(() => () => teardown(), [teardown]);

  const value: CallContextValue = {
    session, incoming, startCall, acceptCall, rejectCall,
    endCall: () => endCall(false),
    toggleMic, toggleCamera, toggleSpeaker, switchCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCalls() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCalls must be used within CallProvider");
  return ctx;
}

export function useCallHistory() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<(CallRow & { peer: PeerProfile | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("calls")
        .select("*")
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = (data ?? []) as CallRow[];
      const peerIds = Array.from(new Set(rows.map(r => r.caller_id === user.id ? r.receiver_id : r.caller_id)));
      const { data: profiles } = peerIds.length
        ? await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", peerIds)
        : { data: [] as PeerProfile[] };
      const map = new Map((profiles ?? []).map(p => [p.id, p as PeerProfile]));
      if (cancelled) return;
      setCalls(rows.map(r => ({ ...r, peer: map.get(r.caller_id === user.id ? r.receiver_id : r.caller_id) ?? null })));
      setLoading(false);
    };
    void load();

    const ch = supabase
      .channel(`call-history:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  return { calls, loading };
}
