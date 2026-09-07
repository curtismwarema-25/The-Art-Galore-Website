import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type RouteMeta = {
  title: string;
  description: string;
};

const brandName = "The Art Galore International";

const defaultMeta: RouteMeta = {
  title: `${brandName} | A Free Space to Connect Us All`,
  description:
    "Art Galore creates events and cultural experiences as a free space to connect us all.",
};

function upsertMeta({
  selector,
  attr,
  key,
  content,
}: {
  selector: string;
  attr: "name" | "property";
  key: string;
  content: string;
}) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function getRouteMeta(pathname: string): RouteMeta {
  if (pathname === "/") {
    return {
      title: `${brandName} | A Free Space to Connect Us All`,
      description:
        "Art Galore creates events and cultural experiences as a free space to connect us all.",
    };
  }
  if (pathname === "/events") {
    return {
      title: `Events | ${brandName}`,
      description: "Browse upcoming events and book your next Art Galore International experience.",
    };
  }
  if (pathname.startsWith("/events/")) {
    return {
      title: `Event Details | ${brandName}`,
      description:
        "View event details, ticket options, and collaboration highlights from Art Galore International.",
    };
  }
  if (pathname === "/artists") {
    return {
      title: `Artists | ${brandName}`,
      description:
        "Meet artist-members from the Art Galore International leadership and collective community.",
    };
  }
  if (pathname.startsWith("/artists/")) {
    return {
      title: `Artist Profile | ${brandName}`,
      description:
        "Explore artist profiles and creative works featured by Art Galore International.",
    };
  }
  if (pathname === "/gallery") {
    return {
      title: `Gallery | ${brandName}`,
      description: "Explore visual highlights from Art Galore International events and collaborations.",
    };
  }
  if (pathname === "/partners") {
    return {
      title: `Partners & Collaborations | ${brandName}`,
      description:
        "Discover organizations, sponsors, and collaborators supporting Art Galore International.",
    };
  }
  if (pathname === "/about") {
    return {
      title: `About | ${brandName}`,
      description:
        "Meet the leadership team and collective members powering Art Galore International.",
    };
  }
  if (pathname === "/contact") {
    return {
      title: `Contact | ${brandName}`,
      description: "Contact Art Galore International for events, partnerships, and media inquiries.",
    };
  }
  if (pathname === "/share") {
    return {
      title: `Share Your Moment | ${brandName}`,
      description:
        "Submit your photos and memories from Art Galore International events to the community gallery.",
    };
  }
  if (pathname.startsWith("/tickets/")) {
    return {
      title: `Ticket Confirmation | ${brandName}`,
      description:
        "View your Art Galore International ticket confirmation, QR code, and order details.",
    };
  }
  if (pathname === "/privacy-policy") {
    return {
      title: `Privacy Policy | ${brandName}`,
      description: "Read the Art Galore International privacy policy.",
    };
  }
  if (pathname === "/terms-of-use") {
    return {
      title: `Terms of Use | ${brandName}`,
      description: "Read the Art Galore International terms of use.",
    };
  }
  if (pathname === "/ticket-refund-policy") {
    return {
      title: `Ticket Refund Policy | ${brandName}`,
      description: "Read the Art Galore International ticket refund policy.",
    };
  }
  if (pathname === "/admin/login") {
    return {
      title: `Admin Sign In | ${brandName}`,
      description: "Sign in to access the Art Galore International admin dashboard.",
    };
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return {
      title: `Admin Dashboard | ${brandName}`,
      description: "Manage events, partners, artists, and platform content for Art Galore International.",
    };
  }
  return {
    title: `Page Not Found | ${brandName}`,
    description: "The page you requested does not exist on the Art Galore International website.",
  };
}

export default function RouteMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteMeta(location.pathname);
    document.title = meta.title;

    upsertMeta({
      selector: 'meta[name="description"]',
      attr: "name",
      key: "description",
      content: meta.description,
    });
    upsertMeta({
      selector: 'meta[property="og:title"]',
      attr: "property",
      key: "og:title",
      content: meta.title,
    });
    upsertMeta({
      selector: 'meta[property="og:description"]',
      attr: "property",
      key: "og:description",
      content: meta.description,
    });
    upsertMeta({
      selector: 'meta[name="twitter:title"]',
      attr: "name",
      key: "twitter:title",
      content: meta.title,
    });
    upsertMeta({
      selector: 'meta[name="twitter:description"]',
      attr: "name",
      key: "twitter:description",
      content: meta.description,
    });
  }, [location.pathname]);

  return null;
}

