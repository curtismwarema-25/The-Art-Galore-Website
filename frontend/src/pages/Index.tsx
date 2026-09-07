import { FormEvent, ReactNode, useMemo, useState } from "react";
import { ArrowRight, Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import ScrollReveal from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import { useEventQuery } from "@/hooks/queries/useEventQuery";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";
import type { EventRecord } from "@/types/models";
import { hasActiveTicketTier } from "@/lib/homepageState";

type SiteSettingsPreview = { heroTitle?: string; heroSubtitle?: string; whatsappLink?: string };
type EventDetail = NonNullable<ReturnType<typeof useEventQuery>["data"]>;

function isTicketedEvent(event: EventDetail) {
  return hasActiveTicketTier(event.ticketTiers);
}

function TicketRecovery() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedToken = token.trim();
    if (normalizedToken) navigate(`/orders/track/${encodeURIComponent(normalizedToken)}`);
  }

  return (
    <div id="ticket-recovery" className="border border-border bg-card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <Ticket size={20} className="mt-1 shrink-0 text-accent" />
        <div>
          <h2 className="font-display text-lg text-foreground">Find My Ticket</h2>
          <p className="mt-1 text-sm text-foreground-secondary">Enter the secure order token from your confirmation link to reopen your order and tickets.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Order tracking token" aria-label="Order tracking token" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent" />
        <Button type="submit" variant="outline" disabled={!token.trim()}>Open Order</Button>
      </form>
    </div>
  );
}

function BrandHero({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 opacity-25"><img src="/bg.jpg" alt="" className="h-full w-full object-cover" /></div>
      <div className="relative mx-auto flex min-h-[520px] max-w-screen-xl items-end px-4 py-16 md:min-h-[600px] md:px-8 md:py-24">
        <div className="max-w-3xl">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Art Galore International</p>
          <h1 className="mt-4 text-display-xl text-primary-foreground">{title}</h1>
          <p className="mt-6 max-w-2xl text-body-lg text-primary-foreground/75">{subtitle}</p>
          {action && <div className="mt-8 flex flex-wrap gap-3">{action}</div>}
        </div>
      </div>
    </section>
  );
}

function ActiveEventState({ event }: { event: EventDetail }) {
  return (
    <>
      <section className="section-padding bg-background">
        <div className="container-narrow grid items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden bg-secondary/20"><img src={event.heroImage || "/bg.jpg"} alt={event.title} className="aspect-[4/3] w-full object-cover" /></div>
          <div className="space-y-5">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Next experience</p>
            <h2 className="text-display-lg">{event.title}</h2>
            <p className="text-body">{event.summary}</p>
            <div className="grid gap-3 text-sm text-foreground-secondary">
              <p className="flex items-center gap-3"><Calendar size={16} className="text-accent" />{event.date}</p>
              <p className="flex items-center gap-3"><Clock size={16} className="text-accent" />{event.time}</p>
              <p className="flex items-center gap-3"><MapPin size={16} className="text-accent" />{event.venue}</p>
            </div>
            <Button variant="accent" size="lg" asChild><Link to={`/events/${event.slug}`} className="inline-flex items-center gap-2">Get Tickets <ArrowRight size={16} /></Link></Button>
          </div>
        </div>
      </section>
      {(event.highlights.length > 0 || event.lineup.length > 0) && (
        <section className="section-padding bg-secondary/20"><div className="container-narrow grid gap-8 md:grid-cols-2">
          {event.highlights.length > 0 && <ScrollReveal><p className="font-display text-xs uppercase tracking-[0.3em] text-accent">The experience</p><h2 className="mt-3 text-display-md">What to expect</h2><ul className="mt-5 space-y-3 text-body">{event.highlights.slice(0, 5).map((highlight) => <li key={highlight}>— {highlight}</li>)}</ul></ScrollReveal>}
          {event.lineup.length > 0 && <ScrollReveal><p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Featuring</p><h2 className="mt-3 text-display-md">Artists and collaborators</h2><div className="mt-5 space-y-3">{event.lineup.slice(0, 6).map((person) => <div key={person.id} className="flex items-center gap-3 border-b border-border pb-3">{person.image && <img src={person.image} alt="" className="h-10 w-10 rounded-full object-cover" />}<div><p className="font-display text-sm text-foreground">{person.name}</p><p className="text-xs text-foreground-secondary">{person.role}</p></div></div>)}</div></ScrollReveal>}
        </div></section>
      )}
      <section className="section-padding bg-background"><div className="container-narrow grid gap-8 lg:grid-cols-[1fr_0.8fr]"><div><p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Plan your visit</p><h2 className="mt-3 text-display-md">Everything you need to know before you go.</h2><p className="mt-4 max-w-2xl text-body">View the full event details, ticket options, and payment instructions before reserving your place.</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="accent" asChild><Link to={`/events/${event.slug}`}>View event details</Link></Button><Button variant="outline" asChild><Link to="/contact">Need help?</Link></Button></div></div><TicketRecovery /></div></section>
    </>
  );
}

function NoActiveEventState({ events, settings }: { events: EventRecord[]; settings?: SiteSettingsPreview }) {
  const pastEvents = events.filter((event) => event.lifecycle === "past").slice(0, 3);
  const heroTitle = settings?.heroTitle || "A Free Space to Connect Us All";
  const heroSubtitle = settings?.heroSubtitle || "Immersive experiences, shared creativity, and meaningful connection.";
  return (
    <>
      <BrandHero title={heroTitle} subtitle={heroSubtitle} action={<><Button variant="accent" size="lg" asChild><Link to="/events">Next Event</Link></Button><Button variant="outline" size="lg" asChild><Link to="/about">About Art Galore</Link></Button></>} />
      <section className="section-padding bg-background"><div className="container-narrow grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div><p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Between experiences</p><h2 className="mt-3 text-display-lg">The next gathering is being prepared.</h2><p className="mt-5 max-w-2xl text-body">Nothing is currently on sale, but Art Galore is active and preparing what comes next. Explore our story, check previous experiences, or contact us for updates.</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" asChild><Link to="/contact">Contact the team</Link></Button>{settings?.whatsappLink && <Button variant="outline" asChild><a href={settings.whatsappLink} target="_blank" rel="noreferrer">Stay updated on WhatsApp</a></Button>}</div></div>
        <TicketRecovery />
      </div></section>
      {pastEvents.length > 0 && <section className="section-padding bg-secondary/20"><div className="container-narrow"><PageHeader eyebrow="Previous experiences" title="See what we have created" description="Past events remain available as a record of the Art Galore experience." /><div className="mt-8 grid gap-4 md:grid-cols-3">{pastEvents.map((event) => <article key={event.id} className="border border-border bg-card p-5"><p className="font-display text-xs uppercase tracking-[0.2em] text-accent">{event.date}</p><h3 className="mt-3 font-display text-xl text-foreground">{event.title}</h3><p className="mt-2 text-sm text-foreground-secondary">{event.summary}</p><Link to={`/events/${event.slug}`} className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-accent">View experience <ArrowRight size={14} /></Link></article>)}</div></div></section>}
    </>
  );
}

export default function Index() {
  const eventsQuery = useEventsQuery();
  const settingsQuery = usePublicSiteSettingsQuery();
  const upcomingEvent = useMemo(() => eventsQuery.data?.find((event) => event.lifecycle === "upcoming"), [eventsQuery.data]);
  const eventDetailQuery = useEventQuery(upcomingEvent?.slug ?? "");
  const activeEvent = eventDetailQuery.data && isTicketedEvent(eventDetailQuery.data) ? eventDetailQuery.data : undefined;
  const evaluatingEvent = Boolean(upcomingEvent && eventDetailQuery.isLoading);
  if (eventsQuery.isLoading || evaluatingEvent) return <BrandHero title={settingsQuery.data?.heroTitle || "A Free Space to Connect Us All"} subtitle="Discover the next Art Galore experience." />;
  return activeEvent ? <ActiveEventState event={activeEvent} /> : <NoActiveEventState events={eventsQuery.data ?? []} settings={settingsQuery.data} />;
}
