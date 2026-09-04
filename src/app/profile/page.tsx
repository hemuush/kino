"use client";

import { useMedia } from "@/context/MediaContext";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle,
  Clock,
  ArrowLeft,
  Trophy,
  Tv2,
  Film,
  Star,
  TrendingUp,
  Clapperboard,
  User,
  LayoutGrid,
  NotebookPen,
  Share2,
  BarChart3,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { isEpisodic, getWatchedRuntimeMinutes } from "@/lib/db";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { AchievementsManager } from "@/components/profile/AchievementsManager";
import { JournalManager } from "@/components/profile/JournalManager";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProfileTab = 'overview' | 'achievements' | 'journal';

const PROFILE_TABS: { id: ProfileTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'journal', label: 'Journal', icon: NotebookPen },
];


const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 28, delay: i * 0.07 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 26, delay: i * 0.08 },
  }),
};

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  index: number;
  accent?: string;
}

function StatPill({ icon, label, value, sub, index, accent = "text-primary" }: StatPillProps) {
  return (
    <motion.div
      variants={scaleIn}
      custom={index}
      className="flex-1 min-w-[120px] relative rounded-3xl p-5 bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden group hover:border-border transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className={`mb-3 ${accent}`}>{icon}</div>
      <div className="font-display font-black text-3xl sm:text-4xl text-foreground tracking-tighter leading-none">
        {value}
        {sub && <span className="text-base sm:text-lg text-muted-foreground font-bold ml-0.5">{sub}</span>}
      </div>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { entries, isLoading } = useMedia();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Deferred: anchors the trailing-6-month trend window without calling Date.now() during render.
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    Promise.resolve().then(() => setNowTs(Date.now()));
  }, []);

  const monthlyTrend = useMemo(() => {
    if (!nowTs) return [];
    const base = new Date(nowTs);
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), minutes: 0 };
    });
    const indexByKey = new Map(months.map((m, idx) => [m.key, idx]));
    entries.forEach((e) => {
      const d = new Date(e.updatedAt || e.createdAt);
      const idx = indexByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (idx !== undefined) months[idx].minutes += getWatchedRuntimeMinutes(e);
    });
    return months;
  }, [entries, nowTs]);

  const handleSharePersona = (personaName: string, personaIcon: string, personaTagline: string) => {
    const payload = { p: personaName, pi: personaIcon, pt: personaTagline };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `${window.location.origin}/share?d=${encoded}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success('Persona link copied!');
    }
  };

  const stats = useMemo(() => {
    let totalWatchMinutes = 0;
    let movieCount = 0;
    let showCount = 0;
    let animeCount = 0;

    entries.forEach((e) => {
      if (e.type === "Movie") movieCount++;
      else if (e.type === "Anime") animeCount++;
      else showCount++;

      // Use the canonical runtime function — same as Wraps/Recap uses
      totalWatchMinutes += getWatchedRuntimeMinutes(e);
    });

    const topRated = [...entries]
      .filter((e) => e.status === "Completed" && e.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
    const currentlyWatching = entries
      .filter((e) => e.status === "Watching")
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];

    const completedCount = entries.filter((e) => e.status === "Completed").length;
    const planToWatchCount = entries.filter((e) => e.status === "Plan to Watch").length;
    const watchingCount = entries.filter((e) => e.status === "Watching").length;

    let badge = {
      name: "Beginner",
      icon: "🌱",
      gradient: "from-emerald-500/20 to-green-500/20",
      color: "text-emerald-500",
    };
    if (completedCount >= 100)
      badge = { name: "Grandmaster", icon: "👑", gradient: "from-amber-400/20 to-orange-500/20", color: "text-amber-500" };
    else if (completedCount >= 50)
      badge = { name: "Veteran", icon: "🎬", gradient: "from-purple-500/20 to-pink-500/20", color: "text-purple-500" };
    else if (completedCount >= 10)
      badge = { name: "Explorer", icon: "🧭", gradient: "from-blue-400/20 to-cyan-500/20", color: "text-blue-400" };

    const daysWatched = Math.floor(totalWatchMinutes / (24 * 60));
    const hoursWatched = Math.floor((totalWatchMinutes % (24 * 60)) / 60);
    const total = entries.length;

    // Personality — a permanent, always-current identity read on *how* you watch,
    // not just how much. Computed entirely from data already tracked above.
    const reviewedCount = entries.filter((e) => e.review && e.review.trim()).length;
    const highlyRatedCount = entries.filter((e) => e.status === "Completed" && e.rating >= 8).length;
    const movieShare = total > 0 ? movieCount / total : 0;
    const episodicShare = total > 0 ? (showCount + animeCount) / total : 0;
    const completionRate = total > 0 ? completedCount / total : 0;
    const highRatedShare = completedCount > 0 ? highlyRatedCount / completedCount : 0;
    const reviewRate = completedCount > 0 ? reviewedCount / completedCount : 0;
    const backlogRate = total > 0 ? planToWatchCount / total : 0;

    const totalRewatches = entries.reduce((sum, e) => sum + (e.rewatchCount || 0), 0);
    const mostRewatched = [...entries].sort((a, b) => (b.rewatchCount || 0) - (a.rewatchCount || 0))[0];

    let personality = { name: "The Voyager", tagline: "A balanced taste across every kind of screen.", icon: "🧭" };
    if (total < 3) {
      personality = { name: "The Newcomer", tagline: "Your watching story starts here.", icon: "🌱" };
    } else if (reviewRate >= 0.5 && completedCount >= 5) {
      personality = { name: "The Critic", tagline: "You don't just watch — you write about it.", icon: "✍️" };
    } else if (completionRate >= 0.75 && total >= 8) {
      personality = { name: "The Finisher", tagline: "Once you start something, you see it through.", icon: "🏁" };
    } else if (episodicShare >= 0.6 && total >= 5) {
      personality = { name: "The Marathoner", tagline: "Seasons don't scare you — you binge to the finale.", icon: "📺" };
    } else if (movieShare >= 0.6 && total >= 5) {
      personality = { name: "The Cinephile", tagline: "Two hours, a story, and the credits roll — that's home.", icon: "🎞️" };
    } else if (highRatedShare >= 0.5 && completedCount >= 5) {
      personality = { name: "The Curator", tagline: "You rate generously — your top picks say it all.", icon: "💎" };
    } else if (backlogRate >= 0.5 && total >= 5) {
      personality = { name: "The Collector", tagline: "Your watchlist is a growing archive of good taste.", icon: "🗂️" };
    }

    return {
      daysWatched,
      hoursWatched,
      topRated,
      currentlyWatching,
      badge,
      personality,
      completedCount,
      planToWatchCount,
      watchingCount,
      movieCount,
      showCount,
      animeCount,
      total,
      totalRewatches,
      mostRewatched: mostRewatched && (mostRewatched.rewatchCount || 0) > 0 ? mostRewatched : null,
    };
  }, [entries]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground"
        >
          Loading profile...
        </motion.div>
      </div>
    );
  }

  const {
    daysWatched,
    hoursWatched,
    topRated,
    currentlyWatching,
    badge,
    personality,
    completedCount,
    planToWatchCount,
    watchingCount,
    movieCount,
    showCount,
    animeCount,
    total,
    totalRewatches,
    mostRewatched,
  } = stats;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground hide-scrollbar">
      {/* ── Ambient Background ── */}
      <AmbientGlow fixed glows={[
        "-top-1/4 -left-1/4 w-3/4 h-3/4 bg-primary/5 blur-[160px]",
        "top-1/2 -right-1/4 w-2/4 h-2/4 bg-violet-500/5 blur-[140px]",
        "-bottom-1/4 left-1/3 w-2/5 h-2/5 bg-blue-500/5 blur-[120px]",
      ]} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-28">

        {/* ── Back Button ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-0.5 transition-transform duration-200"
            />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* ── Hero: User Identity ── */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="mb-6"
        >
          <div className="relative rounded-4xl overflow-hidden border border-border/60 bg-card/50 backdrop-blur-2xl shadow-lg">
            {/* Gradient header band */}
            <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/25 via-violet-500/15 to-blue-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
              <div className="absolute right-12 top-1/2 -translate-y-1/2 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute left-1/3 top-0 w-20 h-20 bg-violet-500/20 rounded-full blur-xl" />
              <div className="absolute left-8 bottom-0 w-12 h-12 bg-blue-500/20 rounded-full blur-lg" />
            </div>

            <div className="px-6 sm:px-8 pb-6 sm:pb-8 -mt-10 sm:-mt-14 relative">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                {/* Avatar */}
                <motion.div variants={fadeUp} custom={0} className="relative shrink-0">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-background shadow-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/30 border-4 border-background shadow-xl flex items-center justify-center">
                      <User size={36} className="text-primary" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 text-xl leading-none select-none">
                    {badge.icon}
                  </div>
                </motion.div>

                {/* Identity text */}
                <div className="flex-1 min-w-0 pt-2 sm:pt-0 sm:pb-1">
                  <motion.div
                    variants={fadeUp}
                    custom={1}
                    className="flex flex-wrap items-center gap-2 mb-1"
                  >
                    <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
                      {user?.name || "Kino Watcher"}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-current/20 bg-gradient-to-r ${badge.gradient} ${badge.color}`}
                    >
                      <Trophy size={10} />
                      {badge.name}
                    </span>
                  </motion.div>
                  <motion.p variants={fadeUp} custom={1.5} className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight mb-1 flex flex-wrap items-center gap-x-2">
                    <span><span aria-hidden="true">{personality.icon}</span> {personality.name}</span>
                    <span className="text-muted-foreground font-sans font-medium text-xs sm:text-sm">{personality.tagline}</span>
                    <button
                      onClick={() => handleSharePersona(personality.name, personality.icon, personality.tagline)}
                      className="inline-flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-full border border-primary/20 transition-colors"
                      title="Copy a shareable link for your persona"
                    >
                      <Share2 size={10} /> Share
                    </button>
                  </motion.p>
                  <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm truncate">
                    {user?.email || ""}
                  </motion.p>
                  <motion.p
                    variants={fadeUp}
                    custom={3}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mt-1.5"
                  >
                    {total} {total === 1 ? "entry" : "entries"} tracked
                  </motion.p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Tab Switcher ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
          className="mb-6 flex justify-center sm:justify-start"
        >
          <nav className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted/30 p-1 backdrop-blur-2xl">
            {PROFILE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] tracking-wider uppercase font-display font-semibold transition-colors relative z-10 ${
                    isActive ? "text-primary-foreground dark:text-black" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon size={14} /> <span className="mt-0.5">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="profile-active-tab-pill"
                      className="absolute inset-0 bg-primary rounded-xl border border-primary -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
        {activeTab === 'overview' && (
        <>
        {/* ── Stats Row ── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-3">
            <StatPill
              index={0}
              icon={<Clock size={20} />}
              label="Watch time"
              value={daysWatched > 0 ? `${daysWatched}d` : `${hoursWatched}h`}
              sub={daysWatched > 0 ? ` ${hoursWatched}h` : undefined}
              accent="text-primary"
            />
            <StatPill
              index={1}
              icon={<Star size={20} />}
              label="Completed"
              value={completedCount}
              accent="text-amber-500"
            />
            <StatPill
              index={2}
              icon={<TrendingUp size={20} />}
              label="Plan to Watch"
              value={planToWatchCount}
              accent="text-blue-400"
            />
            <StatPill
              index={3}
              icon={<Film size={20} />}
              label="Movies"
              value={movieCount}
              accent="text-violet-500"
            />
            <StatPill
              index={4}
              icon={<Tv2 size={20} />}
              label="Shows & Anime"
              value={showCount + animeCount}
              accent="text-cyan-500"
            />
            {totalRewatches > 0 && (
              <StatPill
                index={5}
                icon={<Repeat size={20} />}
                label="Rewatches"
                value={totalRewatches}
                accent="text-rose-500"
              />
            )}
          </div>
          {mostRewatched && (
            <p className="mt-3 text-xs text-muted-foreground font-medium px-1">
              Most rewatched: <span className="text-foreground font-semibold">{mostRewatched.title}</span> ({mostRewatched.rewatchCount}×)
            </p>
          )}
        </motion.section>

        {/* ── Watch Time Trend ── */}
        {monthlyTrend.length > 0 && monthlyTrend.some(m => m.minutes > 0) && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
            className="mb-6 rounded-[28px] border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm p-6"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5">
              <BarChart3 size={13} />
              Watch Time — Last 6 Months
            </div>
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-28">
              {(() => {
                const max = Math.max(...monthlyTrend.map(m => m.minutes), 1);
                return monthlyTrend.map((m) => {
                  const hours = Math.round((m.minutes / 60) * 10) / 10;
                  const heightPct = Math.max(4, Math.round((m.minutes / max) * 100));
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end" title={`${hours}h in ${m.label}`}>
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${heightPct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className={`w-full max-w-[36px] rounded-t-lg ${m.minutes > 0 ? 'bg-primary' : 'bg-muted'}`}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.label}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.section>
        )}

        {/* ── Currently Watching + Library Breakdown ── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          className="mb-6 grid grid-cols-1 sm:grid-cols-5 gap-4"
        >
          {/* Currently Watching — wider */}
          <motion.div
            variants={scaleIn}
            custom={0}
            className="sm:col-span-3 rounded-[28px] overflow-hidden relative border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm min-h-[160px] group"
          >
            {currentlyWatching?.coverImage && (
              <div className="absolute inset-0">
                <img
                  src={currentlyWatching.coverImage}
                  alt=""
                  className="w-full h-full object-cover opacity-10 dark:opacity-15 blur-xl scale-110 group-hover:opacity-20 transition-opacity duration-700"
                />
              </div>
            )}
            <div className="relative z-10 p-6 flex items-center gap-5 h-full">
              {currentlyWatching ? (
                <>
                  {currentlyWatching.coverImage ? (
                    <img
                      src={currentlyWatching.coverImage}
                      alt={currentlyWatching.title}
                      className="w-[72px] h-[100px] rounded-xl object-cover shadow-lg border border-border/40 shrink-0"
                    />
                  ) : (
                    <div className="w-[72px] h-[100px] rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/40">
                      <Clapperboard size={24} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                        <PlayCircle size={10} />
                        Now Watching
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-foreground line-clamp-2 tracking-tight">
                      {currentlyWatching.title}
                    </h3>
                    {isEpisodic(currentlyWatching) && (
                      <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                        Episode{" "}
                        <span className="text-foreground font-bold">
                          {currentlyWatching.episodesWatched || 0}
                        </span>
                        {currentlyWatching.episodesTotal
                          ? ` / ${currentlyWatching.episodesTotal}`
                          : ""}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1 font-bold uppercase tracking-[0.2em]">
                      {currentlyWatching.type}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
                    <PlayCircle size={22} className="text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="text-foreground font-bold text-sm">Nothing playing</p>
                    <p className="text-muted-foreground text-xs mt-0.5 font-medium">
                      Mark something as Watching in your collection.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Library Breakdown */}
          <motion.div
            variants={scaleIn}
            custom={1}
            className="sm:col-span-2 rounded-[28px] p-6 border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5">
              <Clapperboard size={13} />
              Library Mix
            </div>
            <div className="space-y-3.5">
              {[
                { label: "Movies", count: movieCount, color: "bg-violet-500", icon: <Film size={12} /> },
                { label: "TV Shows", count: showCount, color: "bg-blue-500", icon: <Tv2 size={12} /> },
                { label: "Anime", count: animeCount, color: "bg-primary", icon: <Star size={12} /> },
                { label: "Watching", count: watchingCount, color: "bg-cyan-500", icon: <PlayCircle size={12} /> },
              ].map(({ label, count, color, icon }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        {icon}
                        {label}
                      </span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
                        className={`h-full rounded-full ${color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.section>

        {/* ── Hall of Fame ── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="rounded-[28px] border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                  <Star size={14} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider text-foreground">
                    Hall of Fame
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-medium">Your highest-rated titles</p>
                </div>
              </div>
              {topRated.length > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/40">
                  {topRated.length} {topRated.length === 1 ? "pick" : "picks"}
                </span>
              )}
            </div>

            <div className="p-6 sm:p-8 pt-5 sm:pt-6">
              {topRated.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
                  {topRated.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      variants={scaleIn}
                      custom={i + 1}
                      className="aspect-[2/3] rounded-2xl overflow-hidden relative group bg-muted border border-border/50 shadow-sm cursor-pointer"
                    >
                      {entry.coverImage ? (
                        <img
                          src={entry.coverImage}
                          alt={entry.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Clapperboard size={24} className="text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Title overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5 pointer-events-none">
                        <span className="text-white text-[10px] font-bold line-clamp-2 leading-tight drop-shadow-md">
                          {entry.title}
                        </span>
                      </div>
                      {/* Rating badge on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-amber-500 shadow-md">
                          <Star size={9} className="text-white fill-white" />
                          <span className="text-[9px] font-bold text-white leading-none">{entry.rating}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-14 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Star size={24} className="text-amber-500/40" />
                  </div>
                  <p className="text-foreground font-bold text-base mb-1">No rated titles yet</p>
                  <p className="text-muted-foreground text-sm text-center max-w-xs font-medium">
                    Rate completed titles in your collection to fill your Hall of Fame.
                  </p>
                  <Link
                    href="/collection"
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 hover:bg-foreground/10 border border-border/60 text-foreground text-sm font-semibold transition-all"
                  >
                    Browse Collection
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.section>
        </>
        )}

        {activeTab === 'achievements' && (
          <div className="rounded-[28px] border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm p-6 sm:p-8">
            <AchievementsManager />
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="rounded-[28px] border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm p-6 sm:p-8 min-h-[500px] flex flex-col">
            <JournalManager />
          </div>
        )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}


