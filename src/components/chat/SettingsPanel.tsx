import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Palette, Shield, Bell, LogOut, Trash2, Camera,
  Eye, EyeOff, Ghost, Volume2, VolumeX, Sun, Moon, Sparkles, Save, Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, THEMES, type ThemeId } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow } from "@/hooks/useRealtimeChat";
import { toast } from "sonner";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "profile" | "appearance" | "privacy" | "notifications" | "account";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "account", label: "Account", icon: LogOut },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [settings, setSettings] = useState<{
    theme: string;
    notifications_enabled: boolean;
    sound_enabled: boolean;
  }>({ theme: "midnight", notifications_enabled: true, sound_enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Privacy toggles
  const [showOnline, setShowOnline] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      ]);
      if (p) {
        const prof = p as ProfileRow;
        setProfile(prof);
        setDisplayName(prof.display_name ?? "");
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setStatusText(prof.status_text ?? "");
        setShowOnline(prof.is_online);
      }
      if (s) {
        setSettings({
          theme: (s as any).theme ?? "midnight",
          notifications_enabled: (s as any).notifications_enabled ?? true,
          sound_enabled: (s as any).sound_enabled ?? true,
        });
      }
      setLoading(false);
    })();
  }, [user, open]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      status_text: statusText.trim() || null,
    }).eq("id", user.id);
    if (error) toast.error("Failed to save profile");
    else {
      toast.success("Profile updated");
      setProfile(prev => prev ? { ...prev, display_name: displayName, username, bio, status_text: statusText } : prev);
    }
    setSaving(false);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    toast.success("Avatar updated");
    setUploading(false);
  };

  const saveSettings = async (updates: Partial<typeof settings>) => {
    if (!user) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      ...newSettings,
    }, { onConflict: "user_id" });
    if (error) toast.error("Failed to save settings");
  };

  const toggleOnlineVisibility = async (val: boolean) => {
    if (!user) return;
    setShowOnline(val);
    await supabase.from("profiles").update({ is_online: val }).eq("id", user.id);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    toast.error("Account deletion requires admin support. Please contact us.");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md flex flex-col glass-panel rounded-none border-l border-border overflow-hidden"
            style={{ background: "var(--surface)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-neon" />
                <h2 className="font-display font-bold text-lg gradient-text">Settings</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-3 border-b border-border overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </motion.button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-neon" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "profile" && (
                      <div className="space-y-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative group">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30" />
                            ) : (
                              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-primary-foreground">
                                {displayName?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => fileRef.current?.click()}
                              disabled={uploading}
                              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:shadow-[0_0_15px_var(--neon-glow)] transition-all"
                            >
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                            </motion.button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadAvatar(f);
                            }} />
                          </div>
                          <div className="text-center">
                            <p className="font-display font-semibold">{displayName || "Unnamed"}</p>
                            {username && <p className="text-xs text-neon">@{username}</p>}
                          </div>
                        </div>

                        {/* Fields */}
                        <div className="space-y-4">
                          <SettingsField label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
                          <SettingsField label="Username" value={username} onChange={setUsername} placeholder="unique_username" prefix="@" />
                          <SettingsField label="Bio" value={bio} onChange={setBio} placeholder="Tell the world about yourself..." multiline />
                          <SettingsField label="Status" value={statusText} onChange={setStatusText} placeholder="What's on your mind?" />
                          <div>
                            <label className="text-xs text-muted-foreground font-medium">Email</label>
                            <div className="mt-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground">
                              {user?.email ?? "—"}
                            </div>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={saveProfile}
                          disabled={saving}
                          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_var(--neon-glow)] transition-all disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {saving ? "Saving..." : "Save Changes"}
                        </motion.button>
                      </div>
                    )}

                    {activeTab === "appearance" && (
                      <div className="space-y-6">
                        <h3 className="font-display font-semibold text-sm">Theme</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: "midnight", label: "Midnight", colors: ["oklch(0.08 0.02 270)", "oklch(0.72 0.25 285)"] },
                            { id: "aurora", label: "Aurora", colors: ["oklch(0.1 0.03 160)", "oklch(0.65 0.28 180)"] },
                            { id: "sunset", label: "Sunset", colors: ["oklch(0.1 0.03 30)", "oklch(0.7 0.22 30)"] },
                          ].map(theme => (
                            <motion.button
                              key={theme.id}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => saveSettings({ theme: theme.id })}
                              className={`p-3 rounded-xl border transition-all text-center ${
                                settings.theme === theme.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-muted-foreground"
                              }`}
                            >
                              <div className="h-8 w-full rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }} />
                              <span className="text-xs font-medium">{theme.label}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "privacy" && (
                      <div className="space-y-4">
                        <ToggleSetting
                          icon={Eye}
                          iconOff={EyeOff}
                          label="Show Online Status"
                          description="Let others see when you're online"
                          value={showOnline}
                          onChange={toggleOnlineVisibility}
                        />
                        <ToggleSetting
                          icon={Ghost}
                          label="Ghost Mode"
                          description="Hide from search and disable read receipts"
                          value={ghostMode}
                          onChange={setGhostMode}
                        />
                      </div>
                    )}

                    {activeTab === "notifications" && (
                      <div className="space-y-4">
                        <ToggleSetting
                          icon={Bell}
                          label="Push Notifications"
                          description="Receive push notifications for new messages"
                          value={settings.notifications_enabled}
                          onChange={(v) => saveSettings({ notifications_enabled: v })}
                        />
                        <ToggleSetting
                          icon={settings.sound_enabled ? Volume2 : VolumeX}
                          label="Sound"
                          description="Play sounds for incoming messages"
                          value={settings.sound_enabled}
                          onChange={(v) => saveSettings({ sound_enabled: v })}
                        />
                      </div>
                    )}

                    {activeTab === "account" && (
                      <div className="space-y-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={signOut}
                          className="w-full p-4 rounded-xl border border-border hover:bg-secondary/50 transition-all flex items-center gap-3"
                        >
                          <LogOut className="h-5 w-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="text-sm font-medium">Log Out</p>
                            <p className="text-xs text-muted-foreground">Sign out of your account</p>
                          </div>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleDeleteAccount}
                          className="w-full p-4 rounded-xl border border-destructive/30 hover:bg-destructive/10 transition-all flex items-center gap-3"
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-destructive">Delete Account</p>
                            <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
                          </div>
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingsField({ label, value, onChange, placeholder, multiline, prefix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; prefix?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      <div className="mt-1 relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neon">{prefix}</span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-input/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full ${prefix ? "pl-8" : "px-4"} py-2.5 rounded-xl bg-input/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
          />
        )}
      </div>
    </div>
  );
}

function ToggleSetting({ icon: Icon, iconOff, label, description, value, onChange }: {
  icon: typeof Eye; iconOff?: typeof EyeOff; label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const ActiveIcon = value ? Icon : (iconOff ?? Icon);
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onChange(!value)}
      className="w-full p-4 rounded-xl border border-border hover:bg-secondary/30 transition-all flex items-center gap-3"
    >
      <ActiveIcon className={`h-5 w-5 ${value ? "text-neon" : "text-muted-foreground"}`} />
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className={`h-6 w-11 rounded-full transition-all relative ${value ? "bg-primary" : "bg-secondary"}`}>
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 h-4 w-4 rounded-full bg-foreground"
        />
      </div>
    </motion.button>
  );
}
