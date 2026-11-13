import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import EventCard from "./EventCard";

const event = {
  id: "event-1",
  slug: "art-galore-opening",
  status: "published" as const,
  title: "Art Galore Opening",
  type: "Art Night",
  phase: "upcoming" as const,
  lifecycle: "upcoming" as const,
  summary: "An evening of shared creativity.",
  description: "A full event description.",
  date: "14 November 2026",
  time: "6:00 PM - 10:00 PM",
  startAt: "2026-11-14T15:00:00.000Z",
  endAt: "2026-11-14T19:00:00.000Z",
  timezone: "Africa/Nairobi",
  venue: "Kisii Cultural Centre",
  capacity: 100,
  heroImage: "/event.jpg",
  supportedBy: [],
  highlights: [],
  lineup: [],
  displayOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("EventCard", () => {
  it("keeps the editorial summary focused on recognition and one clear destination", () => {
    render(
      <MemoryRouter>
        <EventCard event={event} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveTextContent(event.date);
    expect(screen.getByRole("article")).toHaveTextContent(event.venue);
    expect(screen.getByRole("link", { name: /view event/i })).toHaveAttribute("href", `/events/${event.slug}`);
  });
});
