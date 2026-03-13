import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav, BottomNav, StatusBar } from "@/components/Navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import ExplorePage from "@/pages/ExplorePage";
import GeneratePage from "@/pages/GeneratePage";
import GalleryPage from "@/pages/GalleryPage";
import PricingPage from "@/pages/PricingPage";
import AuthPage from "@/pages/AuthPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={ExplorePage} />
      <Route path="/generate" component={GeneratePage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <div className="dark flex flex-col min-h-screen" style={{ background: "var(--k-bg)" }}>
              <TopNav />
              <main className="flex-1 md:pt-14 pb-20 md:pb-0">
                <Router />
              </main>
              <div className="hidden md:block">
                <StatusBar />
              </div>
              <BottomNav />
            </div>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
