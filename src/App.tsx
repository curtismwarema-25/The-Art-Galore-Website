import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import RouteMeta from "@/components/RouteMeta";
import { AuthProvider, ProtectedRoute } from "@/features/auth";
import {
  AdminCheckInPage,
  AdminDashboardPage,
  AdminEventsPage,
  AdminGalleriesPage,
  AdminLayout,
  AdminOrdersPage,
  AdminPartnersPage,
  AdminPeoplePage,
  AdminSettingsPage,
  AdminUploadsPage,
} from "@/features/admin";
import About from "./pages/About";
import AdminLogin from "./pages/AdminLogin";
import ArtistProfile from "./pages/ArtistProfile";
import Artists from "./pages/Artists";
import Contact from "./pages/Contact";
import EventDetail from "./pages/EventDetail";
import Events from "./pages/Events";
import Gallery from "./pages/Gallery";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Partners from "./pages/Partners";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ShareMoment from "./pages/ShareMoment";
import TermsOfUse from "./pages/TermsOfUse";
import TicketConfirmation from "./pages/TicketConfirmation";
import TicketRefundPolicy from "./pages/TicketRefundPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteMeta />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:slug" element={<ArtistProfile />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/share" element={<ShareMoment />} />
              <Route path="/tickets/:ticketId" element={<TicketConfirmation />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/ticket-refund-policy" element={<TicketRefundPolicy />} />
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff", "moderator"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/:id" element={<AdminEventsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:id" element={<AdminOrdersPage />} />
              <Route path="checkin" element={<AdminCheckInPage />} />
              <Route path="people" element={<AdminPeoplePage />} />
              <Route path="gallery" element={<AdminGalleriesPage />} />
              <Route path="uploads" element={<AdminUploadsPage />} />
              <Route path="partners" element={<AdminPartnersPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
